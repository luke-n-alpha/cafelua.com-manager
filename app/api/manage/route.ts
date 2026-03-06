import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@lib/firebase-admin';
import { checkRateLimit } from '@lib/server-utils';

const FIRESTORE_ID_RE = /^[a-zA-Z0-9]{10,30}$/;

/** POST /api/manage — admin operations for comments/guestbook */
export async function POST(request: NextRequest) {
    if (!checkRateLimit('manage', 60, 60_000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const { action, tab, id, limit: rawLimit, after } = body as {
            action: 'list' | 'delete';
            tab: 'comments' | 'guestbook';
            id?: string;
            limit?: number;
            after?: string;
        };

        if (!action || !['list', 'delete'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        if (!tab || !['comments', 'guestbook'].includes(tab)) {
            return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
        }

        const db = getAdminDb();
        const collection = tab === 'comments' ? 'comments' : 'guestbook';

        if (action === 'delete') {
            if (!id || !FIRESTORE_ID_RE.test(id)) {
                return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
            }
            const docRef = db.collection(collection).doc(id);

            if (tab === 'comments') {
                await docRef.update({ deleted: true, content: '' });
                return NextResponse.json({ success: true });
            }

            // Guestbook: soft delete if has replies, hard delete otherwise
            const repliesSnap = await db.collection(collection)
                .where('parentId', '==', id)
                .limit(1)
                .get();

            if (!repliesSnap.empty) {
                await docRef.update({ deleted: true, message: '' });
                return NextResponse.json({ success: true, softDeleted: true });
            }

            await docRef.delete();
            return NextResponse.json({ success: true, softDeleted: false });
        }

        // action === 'list'
        const limitCount = Math.min(rawLimit || 50, 200);
        let q = db.collection(collection).orderBy('createdAt', 'desc');

        if (after) {
            const afterDate = new Date(after);
            if (!isNaN(afterDate.getTime())) {
                q = q.startAfter(Timestamp.fromDate(afterDate));
            }
        }

        const snapshot = await q.limit(limitCount).get();

        if (tab === 'comments') {
            const items = snapshot.docs.map((d) => {
                const data = d.data();
                const ts = data.createdAt as Timestamp | null;
                return {
                    id: d.id,
                    postSlug: data.postSlug ?? '',
                    postType: data.postType ?? '',
                    parentId: data.parentId ?? null,
                    nickname: data.nickname ?? '',
                    email: data.email ?? null,
                    content: data.content ?? '',
                    createdAt: ts?.toDate().toISOString() ?? null,
                    deleted: data.deleted ?? false,
                };
            });
            const last = items.length > 0 ? items[items.length - 1] : null;
            return NextResponse.json({ items, lastCursor: last?.createdAt ?? null });
        }

        // guestbook
        const items = snapshot.docs.map((d) => {
            const data = d.data();
            const ts = data.createdAt as Timestamp | null;
            return {
                id: d.id,
                nickname: data.nickname ?? '',
                message: data.message ?? '',
                isSecret: data.isSecret ?? false,
                createdAt: ts?.toDate().toISOString() ?? null,
                parentId: data.parentId ?? null,
                deleted: data.deleted ?? false,
                email: data.email ?? null,
            };
        });
        const last = items.length > 0 ? items[items.length - 1] : null;
        return NextResponse.json({ items, lastCursor: last?.createdAt ?? null });
    } catch (err) {
        console.error('[manage]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
