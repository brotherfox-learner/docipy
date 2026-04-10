# Docipy (Web)

Next.js frontend for the **AI Knowledge Base** app: documents, RAG chat, flashcards, quizzes, knowledge graphs, and billing (Stripe). It talks to the Fastify API in the sibling `server/` directory.

## Requirements

- **Node.js** 20+ (matches the backend toolchain)
- **npm** (or pnpm/yarn if you prefer)

## Quick start

```bash
cd client/docipy
npm install
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL to your API origin (no trailing slash)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes (for API calls) | Base URL of the Fastify API, e.g. `http://localhost:3001` in dev. Used by Axios and OAuth redirects. No trailing slash. |

Copy [`.env.example`](./.env.example) to `.env.local`. **Do not commit** `.env.local` (it is gitignored).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint |

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **UI / UX:** Framer Motion, `next-themes`, Material Symbols (via Google Fonts in layout)
- **Data:** Axios → REST API (`src/lib/api.ts`)
- **Charts / graph:** D3 (knowledge graph view)

## Repository layout (high level)

```
src/
  app/           # Routes (App Router): (main) shell, documents, auth, etc.
  components/    # Shared UI
  lib/           # API client, auth context, utilities
  types/         # Shared TypeScript types
```

## Backend & full stack

This repo is only the **client**. Run the **server** from `../../server` (see that folder’s README or project docs) so login, uploads, AI, and Stripe webhooks work.

Typical local pairing:

- Frontend: `http://localhost:3000` → `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Backend: Fastify on port `3001` (or your configured `PORT`)

## Production deploy

- Host on **Vercel** (or any Node host for Next.js).
- Set `NEXT_PUBLIC_API_URL` in the host’s environment to your **public API URL** (HTTPS).
- Ensure the API **CORS** and **cookie** settings allow your web origin if you use cross-subdomain auth.

## License

Private / same as the parent monorepo unless stated otherwise.
