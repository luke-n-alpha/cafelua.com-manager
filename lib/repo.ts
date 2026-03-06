import { resolve, relative } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';

/** Root path to cafelua.com/public-home */
export function getRepoPath(): string {
    const p = process.env.CAFELUA_REPO_PATH;
    if (!p) throw new Error('CAFELUA_REPO_PATH not set');
    return p;
}

/** Resolve a path within the repo, preventing path traversal */
export function safePath(base: string, ...segments: string[]): string {
    const resolved = resolve(base, ...segments);
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    if (resolved !== base && !resolved.startsWith(baseWithSlash)) {
        throw new Error('Path traversal detected');
    }
    return resolved;
}

/** Posts directory inside cafelua.com/public-home */
export function getPostsDir(): string {
    return safePath(getRepoPath(), 'src', 'data', 'desk', 'posts');
}

/** Diary posts directory */
export function getDiaryPostsDir(): string {
    return safePath(getRepoPath(), 'src', 'data', 'gallery', 'posts');
}

/** Public images directory for desk posts */
export function getDeskImagesDir(): string {
    return safePath(getRepoPath(), 'public', 'desk');
}

/** Public images directory for diary posts */
export function getDiaryImagesDir(): string {
    return safePath(getRepoPath(), 'public', 'diary');
}

/** Read a file from the repo, returns null if not found */
export function readRepoFile(filePath: string): string | null {
    try {
        return readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

/** Write a file to the repo, creating directories as needed */
export function writeRepoFile(filePath: string, content: string): void {
    const dir = resolve(filePath, '..');
    const repoPath = getRepoPath();
    const repoWithSlash = repoPath.endsWith('/') ? repoPath : repoPath + '/';
    if (dir !== repoPath && !dir.startsWith(repoWithSlash)) {
        throw new Error('Path traversal detected');
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
}

/** List subdirectories in a directory */
export function listDirs(dirPath: string): string[] {
    if (!existsSync(dirPath)) return [];
    return readdirSync(dirPath).filter((name) => {
        const full = resolve(dirPath, name);
        return statSync(full).isDirectory() && !name.startsWith('.');
    });
}

/** Get the relative path from repo root for git operations */
export function relativeToRepo(absPath: string): string {
    return relative(getRepoPath(), absPath);
}
