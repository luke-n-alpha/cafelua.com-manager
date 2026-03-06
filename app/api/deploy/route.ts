import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getRepoPath } from '@lib/repo';
import { isValidSlug } from '@lib/posts';

const execFileAsync = promisify(execFile);

/** POST /api/deploy — git add, commit, push in the cafelua.com repo */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug } = body as { slug?: string };

        if (slug && !isValidSlug(slug)) {
            return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
        }

        const cwd = getRepoPath();
        const gitOpts = { cwd };

        // Stage changes
        await execFileAsync('git', ['add', '-A'], gitOpts);

        // Check if there are staged changes
        const { stdout: diffOutput } = await execFileAsync('git', ['diff', '--cached', '--name-only'], gitOpts);
        const files = diffOutput.trim().split('\n').filter(Boolean);

        if (files.length === 0) {
            return NextResponse.json({ message: 'No changes to deploy', files: [] });
        }

        // Commit
        const msg = slug
            ? `content: update ${slug}`
            : `content: update posts`;
        await execFileAsync('git', ['commit', '-m', msg], gitOpts);

        // Push
        await execFileAsync('git', ['push'], gitOpts);

        return NextResponse.json({ success: true, files });
    } catch (err) {
        console.error('[deploy]', err);
        return NextResponse.json({ error: 'Deploy failed' }, { status: 500 });
    }
}
