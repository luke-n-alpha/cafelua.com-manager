import { NextRequest, NextResponse } from 'next/server';
import { getMarkdownPost, saveMarkdownPost, isValidSlug, isValidLocale } from '@lib/posts';

/** GET /api/posts/[slug] — get a single markdown post */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await params;
        if (!isValidSlug(slug)) {
            return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
        }

        const post = getMarkdownPost(slug);
        if (!post) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (err) {
        console.error('[posts/slug GET]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

/** PUT /api/posts/[slug] — save a markdown post locale */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await params;
        if (!isValidSlug(slug)) {
            return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
        }

        const body = await request.json();
        const { locale, title, date, category, tags, thumbnail, draft, content } = body as {
            locale?: string;
            title?: string;
            date?: string;
            category?: string;
            tags?: string[];
            thumbnail?: string;
            draft?: boolean;
            content?: string;
        };

        if (!locale || !isValidLocale(locale)) {
            return NextResponse.json({ error: 'Invalid locale (ko or en)' }, { status: 400 });
        }
        if (!title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date format (YYYY-MM-DD)' }, { status: 400 });
        }

        saveMarkdownPost(slug, locale, {
            title: title.trim(),
            date,
            category: category || 'cafelua',
            tags: Array.isArray(tags) ? tags : [],
            thumbnail: thumbnail || '',
            draft: draft || false,
            content: content || '',
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[posts/slug PUT]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
