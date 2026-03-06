'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const CATEGORIES = ['cafelua', 'ai', 'it', 'believer', 'xrcloud', 'review', 'art', 'private'];

export default function EditorPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>}>
            <EditorInner />
        </Suspense>
    );
}

function EditorInner() {
    const searchParams = useSearchParams();
    const isNew = searchParams.get('new') === '1';
    const slugParam = searchParams.get('slug') || '';

    const [slug, setSlug] = useState(slugParam);
    const [locale, setLocale] = useState<'ko' | 'en'>('ko');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [category, setCategory] = useState('cafelua');
    const [tags, setTags] = useState('');
    const [thumbnail, setThumbnail] = useState('');
    const [draft, setDraft] = useState(false);
    const [content, setContent] = useState('');
    const [view, setView] = useState<'edit' | 'split' | 'preview'>('edit');
    const [saving, setSaving] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Store per-locale content separately
    const localeContentRef = useRef<Record<string, { title: string; content: string }>>({});

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Load post
    useEffect(() => {
        if (!slugParam || isNew) return;
        (async () => {
            try {
                const res = await fetch(`/api/posts/${slugParam}`);
                if (!res.ok) throw new Error('Not found');
                const data = await res.json();
                setSlug(data.slug);
                setDate(data.date || new Date().toISOString().slice(0, 10));
                setCategory(data.category || 'cafelua');
                setTags((data.tags || []).join(', '));
                setThumbnail(data.thumbnail || '');
                setDraft(data.draft || false);
                // Store both locales
                localeContentRef.current = {
                    ko: { title: data.titleKo || '', content: data.contentKo || '' },
                    en: { title: data.titleEn || '', content: data.contentEn || '' },
                };
                setTitle(data.titleKo || '');
                setContent(data.contentKo || '');
                setLocale('ko');
                setDirty(false);
            } catch {
                showToast('Failed to load post');
            }
        })();
    }, [slugParam, isNew, showToast]);

    // Switch locale
    const handleLocaleSwitch = (newLocale: 'ko' | 'en') => {
        localeContentRef.current[locale] = { title, content };
        const stored = localeContentRef.current[newLocale];
        setTitle(stored?.title || '');
        setContent(stored?.content || '');
        setLocale(newLocale);
    };

    const handleChange = () => { setDirty(true); };

    // Save
    const handleSave = async () => {
        if (!slug.trim()) {
            showToast('Slug is required');
            return;
        }
        setSaving(true);
        try {
            localeContentRef.current[locale] = { title, content };

            for (const loc of ['ko', 'en'] as const) {
                const stored = localeContentRef.current[loc];
                if (!stored?.title && !stored?.content) continue;

                const res = await fetch(`/api/posts/${slug}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locale: loc,
                        title: stored.title,
                        date,
                        category,
                        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                        thumbnail,
                        draft,
                        content: stored.content,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Save failed');
                }
            }
            setDirty(false);
            showToast('Saved');
            if (isNew) {
                window.history.replaceState(null, '', `/editor?slug=${slug}`);
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // Deploy
    const handleDeploy = async () => {
        if (dirty) {
            showToast('Save before deploying');
            return;
        }
        if (!confirm('Commit and push changes?')) return;
        setDeploying(true);
        try {
            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deploy failed');
            showToast(`Deployed: ${data.files?.length || 0} files`);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Deploy failed');
        } finally {
            setDeploying(false);
        }
    };

    // Image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !slug.trim()) {
            showToast('Set slug first, then upload');
            return;
        }
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('slug', slug);
            formData.append('type', 'desk');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            const imgMd = `![${file.name}](${data.path})`;
            if (textareaRef.current) {
                const ta = textareaRef.current;
                const start = ta.selectionStart;
                const before = content.slice(0, start);
                const after = content.slice(ta.selectionEnd);
                const newContent = before + imgMd + '\n' + after;
                setContent(newContent);
                setDirty(true);
            }
            showToast(`Uploaded: ${data.path}`);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Keyboard shortcut
    const handleSaveRef = useRef(handleSave);
    handleSaveRef.current = handleSave;
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveRef.current();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="editor-root">
            {/* Toolbar */}
            <div className="editor-toolbar">
                <input
                    className="input"
                    placeholder="slug"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); handleChange(); }}
                    disabled={!isNew && !!slugParam}
                    style={{ width: 200 }}
                />
                <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); handleChange(); }}
                />
                <select
                    className="select"
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); handleChange(); }}
                >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                    className="input"
                    placeholder="tags (comma separated)"
                    value={tags}
                    onChange={(e) => { setTags(e.target.value); handleChange(); }}
                    style={{ width: 180 }}
                />
                <label className="editor-draft-label">
                    <input type="checkbox" checked={draft} onChange={(e) => { setDraft(e.target.checked); handleChange(); }} />
                    Draft
                </label>

                <div className="editor-actions">
                    {/* Locale */}
                    <div className="pill-group">
                        {(['ko', 'en'] as const).map((loc) => (
                            <button
                                key={loc}
                                onClick={() => handleLocaleSwitch(loc)}
                                className={`pill ${locale === loc ? 'pill-active' : 'pill-inactive'}`}
                            >
                                {loc.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {/* View mode */}
                    <div className="pill-group">
                        {(['edit', 'split', 'preview'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`pill ${view === v ? 'pill-active' : 'pill-inactive'}`}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                    <label className="pill" style={{ cursor: 'pointer', background: '#ede8e0' }}>
                        {uploadingImage ? '...' : 'Image'}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`btn ${dirty ? 'btn-save-dirty' : 'btn-save-clean'}`}
                    >
                        {saving ? '...' : dirty ? 'Save *' : 'Save'}
                    </button>
                    <button
                        onClick={handleDeploy}
                        disabled={deploying || dirty}
                        className="btn btn-primary"
                        style={{ opacity: dirty ? 0.5 : 1 }}
                    >
                        {deploying ? '...' : 'Deploy'}
                    </button>
                </div>
            </div>

            {/* Title */}
            <div className="editor-title">
                <input
                    placeholder={`Title (${locale.toUpperCase()})`}
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); handleChange(); }}
                />
            </div>

            {/* Editor / Preview */}
            <div className="editor-body">
                {(view === 'edit' || view === 'split') && (
                    <textarea
                        ref={textareaRef}
                        className="editor-textarea"
                        value={content}
                        onChange={(e) => { setContent(e.target.value); handleChange(); }}
                        placeholder="Write your post in Markdown..."
                        style={{ borderRight: view === 'split' ? '1px solid #ede8e0' : 'none' }}
                    />
                )}
                {(view === 'preview' || view === 'split') && (
                    <div className="editor-preview">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
