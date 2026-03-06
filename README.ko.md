# Cafe Lua Manager

[🇺🇸 English](README.md)

[cafelua.com](https://github.com/luke-n-alpha/cafelua.com) 의 로컬 관리 도구입니다.

Markdown 포스트 작성, 댓글/방명록 관리, 이미지 업로드, Git 배포 기능을 제공합니다.

## 주요 기능

- **Posts** — Markdown 기반 포스트 목록 + Legacy 포스트 조회
- **Editor** — 분할 화면 Markdown 에디터 (ko/en 다국어, 미리보기, 이미지 업로드)
- **Manage** — 댓글 및 방명록 관리 (Firebase Firestore)
- **Deploy** — Git commit + push 기반 배포 (Vercel 자동 배포 트리거)

## 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Backend | Firebase Admin SDK (Firestore) |
| Markdown | gray-matter (frontmatter), react-markdown (preview) |
| Port | 3100 (localhost 전용) |

## 설치 및 실행

```bash
git clone https://github.com/luke-n-alpha/cafelua.com-manager.git
cd cafelua.com-manager
npm install
```

`.env.local` 파일을 생성하고 다음 환경변수를 설정합니다:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# cafelua.com 레포 경로 (public-home 디렉토리)
CAFELUA_REPO_PATH=/path/to/cafelua.com/public-home
```

**Legacy 포스트 인덱스 생성** (최초 1회):

```bash
cd /path/to/cafelua.com/public-home
npm run generate-index   # src/data/desk/content-index.json 생성
```

이 파일이 없으면 Manager에서 Legacy 포스트가 표시되지 않습니다.

```bash
npm run dev   # http://localhost:3100
```

## 라우트 구조

| Path | 설명 |
|------|------|
| `/` | 포스트 목록 (Markdown + Legacy) |
| `/editor` | Markdown 에디터 |
| `/editor?new=1` | 새 포스트 작성 |
| `/editor?slug=xxx` | 기존 포스트 편집 |
| `/manage` | 댓글/방명록 관리 |

## 포스트 저장 구조

Markdown 포스트는 cafelua.com 레포의 다음 경로에 저장됩니다:

```
public-home/src/data/desk/posts/{slug}/
  index.ko.md    # 한국어
  index.en.md    # 영어
```

Frontmatter 형식:

```yaml
---
title: 포스트 제목
date: 2026-03-06
category: cafelua
tags: [tag1, tag2]
thumbnail: /desk/slug/thumb.webp
draft: true
---
```

## 프로젝트 구조

```
app/
├── page.tsx                      # 포스트 목록 (대시보드)
├── editor/page.tsx               # Markdown 에디터 (react-markdown 미리보기)
├── manage/page.tsx               # 댓글/방명록 관리
├── globals.css                   # Cafe Lua 테마 CSS
├── layout.tsx                    # 루트 레이아웃 (네비게이션)
└── api/
    ├── posts/route.ts            # GET: 전체 포스트 목록
    ├── posts/[slug]/route.ts     # GET: 포스트 조회, PUT: 저장
    ├── manage/route.ts           # POST: 댓글/방명록 목록/삭제
    ├── deploy/route.ts           # POST: git commit + push
    └── upload/route.ts           # POST: 이미지 업로드
lib/
├── firebase-admin.ts             # Firebase Admin SDK 초기화
├── repo.ts                       # 파일시스템 접근 (safePath)
├── posts.ts                      # Markdown/Legacy 포스트 CRUD
└── server-utils.ts               # Rate limiting
```

## 관련 프로젝트

- **[cafelua.com](https://cafelua.com)** — 라이브 웹사이트
- **[cafelua.com 레포](https://github.com/luke-n-alpha/cafelua.com)** — 소스코드 (Vercel 배포)

## License

MIT
