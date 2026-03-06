import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoPath, safePath } from '@lib/repo';
import { isValidSlug } from '@lib/posts';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif'];

/** POST /api/upload — upload an image to public/desk/{slug}/ or public/diary/{slug}/ */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const slug = formData.get('slug') as string | null;
        const type = (formData.get('type') as string) || 'desk';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!slug || !isValidSlug(slug)) {
            return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
        }
        if (!['desk', 'diary'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Validate extension
        const name = file.name.toLowerCase();
        const ext = name.slice(name.lastIndexOf('.'));
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
        }

        // Sanitize filename: keep only alphanumeric, hyphens, dots
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        const repoPath = getRepoPath();
        const dir = safePath(repoPath, 'public', type, slug);
        mkdirSync(dir, { recursive: true });

        const filePath = safePath(dir, safeName);
        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(filePath, buffer);

        const publicPath = `/${type}/${slug}/${safeName}`;
        return NextResponse.json({ success: true, path: publicPath });
    } catch (err) {
        console.error('[upload]', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
