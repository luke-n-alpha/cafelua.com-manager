import matter from 'gray-matter';
import { readdirSync } from 'node:fs';
import { getPostsDir, safePath, readRepoFile, writeRepoFile, listDirs, getRepoPath } from './repo';

export interface PostMeta {
    slug: string;
    date: string;
    titleKo: string;
    titleEn: string;
    category: string;
    tags: string[];
    thumbnail: string;
    source: 'markdown' | 'legacy';
    draft: boolean;
}

export interface PostContent {
    slug: string;
    date: string;
    titleKo: string;
    titleEn: string;
    contentKo: string;
    contentEn: string;
    category: string;
    tags: string[];
    thumbnail: string;
    images: string[];
    draft: boolean;
}

interface Frontmatter {
    title?: string;
    date?: string;
    category?: string;
    tags?: string[];
    thumbnail?: string;
    draft?: boolean;
}

const SLUG_RE = /^[a-z0-9][-a-z0-9가-힣]*$/;
const LOCALE_RE = /^(ko|en)$/;

export function isValidSlug(slug: string): boolean {
    return SLUG_RE.test(slug) && slug.length <= 200;
}

export function isValidLocale(locale: string): boolean {
    return LOCALE_RE.test(locale);
}

/** Parse a markdown file with frontmatter */
function parseMarkdown(content: string): { meta: Frontmatter; body: string } {
    const { data, content: body } = matter(content);
    return {
        meta: {
            title: data.title || '',
            date: data.date ? String(data.date).slice(0, 10) : '',
            category: data.category || 'cafelua',
            tags: Array.isArray(data.tags) ? data.tags : [],
            thumbnail: data.thumbnail || '',
            draft: data.draft === true,
        },
        body,
    };
}

/** List all markdown posts (desk) */
export function listMarkdownPosts(): PostMeta[] {
    const postsDir = getPostsDir();
    const slugs = listDirs(postsDir);
    const posts: PostMeta[] = [];

    for (const slug of slugs) {
        const koPath = safePath(postsDir, slug, 'index.ko.md');
        const enPath = safePath(postsDir, slug, 'index.en.md');
        const koRaw = readRepoFile(koPath);
        const enRaw = readRepoFile(enPath);

        if (!koRaw && !enRaw) continue;

        const ko = koRaw ? parseMarkdown(koRaw) : null;
        const en = enRaw ? parseMarkdown(enRaw) : null;
        const meta = ko?.meta || en?.meta;
        if (!meta) continue;

        posts.push({
            slug,
            date: meta.date || '',
            titleKo: ko?.meta.title || '',
            titleEn: en?.meta.title || '',
            category: meta.category || 'cafelua',
            tags: meta.tags || [],
            thumbnail: meta.thumbnail || '',
            source: 'markdown',
            draft: meta.draft ?? false,
        });
    }

    return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** Get a single markdown post content */
export function getMarkdownPost(slug: string): PostContent | null {
    if (!isValidSlug(slug)) return null;
    const postsDir = getPostsDir();
    const koPath = safePath(postsDir, slug, 'index.ko.md');
    const enPath = safePath(postsDir, slug, 'index.en.md');
    const koRaw = readRepoFile(koPath);
    const enRaw = readRepoFile(enPath);

    if (!koRaw && !enRaw) return null;

    const ko = koRaw ? parseMarkdown(koRaw) : null;
    const en = enRaw ? parseMarkdown(enRaw) : null;
    const meta = ko?.meta || en?.meta;
    if (!meta) return null;

    // List images in public/desk/{slug}/
    const imagesDir = safePath(getRepoPath(), 'public', 'desk', slug);
    let images: string[] = [];
    try {
        const files = readdirSync(imagesDir);
        images = files
            .filter((f) => /\.(webp|png|jpg|jpeg|gif)$/i.test(f))
            .sort()
            .map((f) => `/desk/${slug}/${f}`);
    } catch {
        // no images directory
    }

    return {
        slug,
        date: meta.date || '',
        titleKo: ko?.meta.title || '',
        titleEn: en?.meta.title || '',
        contentKo: ko?.body || '',
        contentEn: en?.body || '',
        category: meta.category || 'cafelua',
        tags: meta.tags || [],
        thumbnail: meta.thumbnail || '',
        images,
        draft: meta.draft ?? false,
    };
}

/** Save a markdown post locale */
export function saveMarkdownPost(
    slug: string,
    locale: string,
    opts: { title: string; date: string; category: string; tags: string[]; thumbnail: string; draft: boolean; content: string }
): void {
    if (!isValidSlug(slug)) throw new Error('Invalid slug');
    if (!isValidLocale(locale)) throw new Error('Invalid locale');

    const postsDir = getPostsDir();
    const filePath = safePath(postsDir, slug, `index.${locale}.md`);

    const frontmatter: Record<string, unknown> = {
        title: opts.title,
        date: opts.date,
        category: opts.category,
    };
    if (opts.tags.length > 0) frontmatter.tags = opts.tags;
    if (opts.thumbnail) frontmatter.thumbnail = opts.thumbnail;
    if (opts.draft) frontmatter.draft = true;

    const md = matter.stringify(opts.content, frontmatter);
    writeRepoFile(filePath, md);
}

/** List legacy posts from deskData.ts (read-only summary) */
export function listLegacyPosts(): PostMeta[] {
    // Read the generated content-index if available, otherwise return empty
    const indexPath = safePath(getRepoPath(), 'src', 'data', 'desk', 'content-index.json');
    const raw = readRepoFile(indexPath);
    if (!raw) return [];

    try {
        const data = JSON.parse(raw) as Array<{
            slug: string;
            date: string;
            titleKo: string;
            titleEn: string;
            category: string;
            tags?: string[];
            thumbnail?: string;
        }>;
        return data.map((p) => ({
            slug: p.slug,
            date: p.date,
            titleKo: p.titleKo,
            titleEn: p.titleEn,
            category: p.category,
            tags: p.tags || [],
            thumbnail: p.thumbnail || '',
            source: 'legacy' as const,
            draft: false,
        }));
    } catch {
        return [];
    }
}

/** Get all posts (markdown + legacy), sorted by date desc */
export function listAllPosts(): PostMeta[] {
    const md = listMarkdownPosts();
    const legacy = listLegacyPosts();
    return [...md, ...legacy].sort((a, b) => b.date.localeCompare(a.date));
}
