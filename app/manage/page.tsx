'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface CommentItem {
    id: string;
    postSlug: string;
    postType: string;
    parentId: string | null;
    nickname: string;
    email: string | null;
    content: string;
    createdAt: string | null;
    deleted: boolean;
}

interface GuestbookItem {
    id: string;
    nickname: string;
    message: string;
    isSecret: boolean;
    createdAt: string | null;
    parentId: string | null;
    deleted: boolean;
    email: string | null;
}

const PAGE_SIZE = 50;

export default function ManagePage() {
    const [tab, setTab] = useState<'comments' | 'guestbook'>('comments');
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [guestbook, setGuestbook] = useState<GuestbookItem[]>([]);
    const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
    const [guestbookCursor, setGuestbookCursor] = useState<string | null>(null);
    const [commentsHasMore, setCommentsHasMore] = useState(true);
    const [guestbookHasMore, setGuestbookHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchData = useCallback(async (t: 'comments' | 'guestbook', cursor?: string | null) => {
        setLoading(true);
        try {
            const body: Record<string, unknown> = { action: 'list', tab: t, limit: PAGE_SIZE };
            if (cursor) body.after = cursor;
            const res = await fetch('/api/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            if (t === 'comments') {
                setComments((prev) => cursor ? [...prev, ...data.items] : data.items);
                setCommentsCursor(data.lastCursor);
                setCommentsHasMore(data.items.length === PAGE_SIZE);
            } else {
                setGuestbook((prev) => cursor ? [...prev, ...data.items] : data.items);
                setGuestbookCursor(data.lastCursor);
                setGuestbookHasMore(data.items.length === PAGE_SIZE);
            }
        } catch {
            showToast('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(tab); }, [tab, fetchData]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this item?')) return;
        try {
            const res = await fetch('/api/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', tab, id }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            if (tab === 'comments') {
                setComments((prev) => prev.map((c) => c.id === id ? { ...c, deleted: true, content: '' } : c));
            } else {
                if (data.softDeleted) {
                    setGuestbook((prev) => prev.map((g) => g.id === id ? { ...g, deleted: true, message: '' } : g));
                } else {
                    setGuestbook((prev) => prev.filter((g) => g.id !== id));
                }
            }
            showToast('Deleted');
        } catch {
            showToast('Delete failed');
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '-';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('ko-KR');
    };

    const filteredComments = filter
        ? comments.filter((c) => c.postSlug.includes(filter))
        : comments;

    const uniqueSlugs = [...new Set(comments.map((c) => c.postSlug))];

    return (
        <div className="container">
            <h1 className="page-title" style={{ marginBottom: 16 }}>Manage</h1>

            <div className="tabs">
                <button
                    onClick={() => setTab('comments')}
                    className={`tab ${tab === 'comments' ? 'tab-active' : 'tab-inactive'}`}
                >
                    Comments ({comments.filter((c) => !c.deleted).length})
                </button>
                <button
                    onClick={() => setTab('guestbook')}
                    className={`tab ${tab === 'guestbook' ? 'tab-active' : 'tab-inactive'}`}
                >
                    Guestbook ({guestbook.filter((g) => !g.deleted).length})
                </button>
                <button
                    onClick={() => fetchData(tab)}
                    disabled={loading}
                    className="btn btn-ghost"
                    style={{ marginLeft: 'auto' }}
                >
                    {loading ? '...' : 'Refresh'}
                </button>
            </div>

            {tab === 'comments' && (
                <div>
                    {uniqueSlugs.length > 1 && (
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="select"
                            style={{ marginBottom: 12 }}
                        >
                            <option value="">All posts</option>
                            {uniqueSlugs.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Post</th>
                                <th>Nickname</th>
                                <th>Content</th>
                                <th>Email</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredComments.map((c) => (
                                <tr
                                    key={c.id}
                                    style={{
                                        opacity: c.deleted ? 0.4 : 1,
                                        background: c.parentId ? '#f9f6f0' : 'transparent',
                                    }}
                                >
                                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.parentId ? '↳ reply' : c.postSlug}
                                    </td>
                                    <td>{c.nickname}</td>
                                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.deleted ? <span style={{ color: '#bbb' }}>(deleted)</span> : c.content}
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#8b7355' }}>{c.email || '-'}</td>
                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: '#8b7355' }}>{formatDate(c.createdAt)}</td>
                                    <td>
                                        {!c.deleted && (
                                            <button onClick={() => handleDelete(c.id)} className="btn-danger">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {commentsHasMore && (
                        <button
                            onClick={() => fetchData('comments', commentsCursor)}
                            disabled={loading}
                            className="btn btn-ghost"
                            style={{ marginTop: 12 }}
                        >
                            {loading ? '...' : 'Load More'}
                        </button>
                    )}
                </div>
            )}

            {tab === 'guestbook' && (
                <div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nickname</th>
                                <th>Message</th>
                                <th>Email</th>
                                <th>Reply</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guestbook.map((g) => (
                                <tr
                                    key={g.id}
                                    style={{
                                        opacity: g.deleted ? 0.4 : 1,
                                        background: g.parentId ? '#f9f6f0' : 'transparent',
                                    }}
                                >
                                    <td>{g.nickname}</td>
                                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {g.deleted ? <span style={{ color: '#bbb' }}>(deleted)</span> : (g.isSecret ? '(secret) ' : '') + g.message}
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#8b7355' }}>{g.email || '-'}</td>
                                    <td style={{ fontSize: '0.8rem' }}>{g.parentId ? '↳' : '-'}</td>
                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: '#8b7355' }}>{formatDate(g.createdAt)}</td>
                                    <td>
                                        {!g.deleted && (
                                            <button onClick={() => handleDelete(g.id)} className="btn-danger">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {guestbookHasMore && (
                        <button
                            onClick={() => fetchData('guestbook', guestbookCursor)}
                            disabled={loading}
                            className="btn btn-ghost"
                            style={{ marginTop: 12 }}
                        >
                            {loading ? '...' : 'Load More'}
                        </button>
                    )}
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
