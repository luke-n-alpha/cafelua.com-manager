import { NextResponse } from 'next/server';
import { listAllPosts } from '@lib/posts';

/** GET /api/posts — list all posts (markdown + legacy) */
export async function GET() {
    try {
        const posts = listAllPosts();
        return NextResponse.json({ posts });
    } catch (err) {
        console.error('[posts GET]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
