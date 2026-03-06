# Cafe Lua Manager

[🇰🇷 한국어](README.ko.md)

Local management tool for [cafelua.com](https://github.com/luke-n-alpha/cafelua.com).

Provides Markdown post editing, comment/guestbook management, image upload, and Git-based deployment.

## Features

- **Posts** — Markdown post list + Legacy post browsing
- **Editor** — Split-pane Markdown editor (ko/en locale, preview, image upload)
- **Manage** — Comment and guestbook moderation (Firebase Firestore)
- **Deploy** — Git commit + push deployment (triggers Vercel auto-deploy)

## Tech Stack

| Item | Technology |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Backend | Firebase Admin SDK (Firestore) |
| Markdown | gray-matter (frontmatter), react-markdown (preview) |
| Port | 3100 (localhost only) |

## Setup

```bash
git clone https://github.com/luke-n-alpha/cafelua.com-manager.git
cd cafelua.com-manager
npm install
```

Create `.env.local` with the following variables:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Path to cafelua.com repo (public-home directory)
CAFELUA_REPO_PATH=/path/to/cafelua.com/public-home
```

**Generate legacy post index** (one-time):

```bash
cd /path/to/cafelua.com/public-home
npm run generate-index   # generates src/data/desk/content-index.json
```

Without this file, legacy posts won't appear in the Manager.

```bash
npm run dev   # http://localhost:3100
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Post list (Markdown + Legacy) |
| `/editor` | Markdown editor |
| `/editor?new=1` | Create new post |
| `/editor?slug=xxx` | Edit existing post |
| `/manage` | Comment/guestbook management |

## Post Storage

Markdown posts are stored in the cafelua.com repo:

```
public-home/src/data/desk/posts/{slug}/
  index.ko.md    # Korean
  index.en.md    # English
```

Frontmatter format:

```yaml
---
title: Post Title
date: 2026-03-06
category: cafelua
tags: [tag1, tag2]
thumbnail: /desk/slug/thumb.webp
draft: true
---
```

## Project Structure

```
app/
├── page.tsx                      # Post list (dashboard)
├── editor/page.tsx               # Markdown editor (react-markdown preview)
├── manage/page.tsx               # Comment/guestbook management
├── globals.css                   # Cafe Lua themed CSS
├── layout.tsx                    # Root layout (navigation)
└── api/
    ├── posts/route.ts            # GET: all posts
    ├── posts/[slug]/route.ts     # GET: single post, PUT: save
    ├── manage/route.ts           # POST: list/delete comments & guestbook
    ├── deploy/route.ts           # POST: git commit + push
    └── upload/route.ts           # POST: image upload
lib/
├── firebase-admin.ts             # Firebase Admin SDK init
├── repo.ts                       # Filesystem access (safePath)
├── posts.ts                      # Markdown/Legacy post CRUD
└── server-utils.ts               # Rate limiting
```

## Related

- **[cafelua.com](https://cafelua.com)** — Live website
- **[cafelua.com repo](https://github.com/luke-n-alpha/cafelua.com)** — Source code (Vercel deployment)

## License

MIT
