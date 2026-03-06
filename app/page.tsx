'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface PostItem {
    slug: string;
    date: string;
    titleKo: string;
    titleEn: string;
    category: string;
    tags: string[];
    source: 'markdown' | 'legacy';
    draft: boolean;
}

export default function DashboardPage() {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'markdown' | 'legacy'>('all');
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/posts');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setPosts(data.posts);
        } catch {
            showToast('Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const filtered = posts.filter((p) => {
        if (filter === 'markdown' && p.source !== 'markdown') return false;
        if (filter === 'legacy' && p.source !== 'legacy') return false;
        if (search) {
            const q = search.toLowerCase();
            return p.titleKo.toLowerCase().includes(q) || p.titleEn.toLowerCase().includes(q) || p.slug.includes(q);
        }
        return true;
    });

    const mdCount = posts.filter((p) => p.source === 'markdown').length;
    const legacyCount = posts.filter((p) => p.source === 'legacy').length;

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Posts</h1>
                <a href="/editor?new=1" className="btn btn-primary">+ New Post</a>
            </div>

            <div className="filter-bar">
                {(['all', 'markdown', 'legacy'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`tab ${filter === f ? 'tab-active' : 'tab-inactive'}`}
                    >
                        {f === 'all' ? `All (${posts.length})` : f === 'markdown' ? `Markdown (${mdCount})` : `Legacy (${legacyCount})`}
                    </button>
                ))}
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                    style={{ marginLeft: 'auto', width: 200 }}
                />
                <button onClick={fetchPosts} disabled={loading} className="btn btn-ghost">
                    {loading ? '...' : 'Refresh'}
                </button>
            </div>

            {loading ? (
                <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading...</p>
            ) : filtered.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No posts found</p>
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Source</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => (
                            <tr key={p.slug}>
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#8b7355' }}>{p.date}</td>
                                <td>
                                    {p.draft && <span className="badge-draft">[Draft]</span>}
                                    {p.titleKo || p.titleEn || p.slug}
                                </td>
                                <td style={{ fontSize: '0.8rem' }}>{p.category}</td>
                                <td>
                                    <span className={`badge ${p.source === 'markdown' ? 'badge-md' : 'badge-legacy'}`}>
                                        {p.source === 'markdown' ? 'MD' : 'Legacy'}
                                    </span>
                                </td>
                                <td>
                                    {p.source === 'markdown' ? (
                                        <a href={`/editor?slug=${p.slug}`} style={{ fontSize: '0.8rem' }}>Edit</a>
                                    ) : (
                                        <span style={{ color: '#bbb', fontSize: '0.75rem' }}>Read-only</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
