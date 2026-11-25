# Himrakshak

**Predict. Avoid. Survive.** Disaster safety for Himalayan roads.
Team Elite Zero Division · Algonex 1.0, Maya Devi University.

- Pitch deck: https://claude.ai/artifact/ShTZDZXfGYoSSJuQZr71kY
- Rules for all AI tools: [AGENTS.md](AGENTS.md)
- Build plan and roles: [docs/PLAN.md](docs/PLAN.md)
- Data sources: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Copy `.env.example` to `.env.local` and fill in the keys (never commit `.env.local`).

### Driver reports (Supabase, free)

1. Create a free project at https://supabase.com.
2. SQL Editor → New query → paste [supabase/schema.sql](supabase/schema.sql) → Run.
3. Project Settings → API: copy the project URL and the publishable (anon) key into `.env.local`.
4. Restart `npm run dev`. The "Rasta report karein" button turns on.

Without keys the map still works; only reports are off.

## Install as an app (PWA)

The service worker only runs in production, so test it with:

```bash
npm run build && npm start
```

- Android / desktop Chrome: tap **App install karein** in the bottom sheet.
- iPhone Safari: Share → Add to Home Screen (the app shows these steps).
- Offline: the last map, rain data and map tiles you opened stay available.
  Supabase reports and fresh rain need a connection.
- Changed `public/sw.js`? Bump `VERSION` in it so phones drop old caches.

## Round-by-round snapshots

Each evaluation round is saved as a git tag: `round-1`, `round-2`, `round-3`.
To open one round as its own folder (to show exactly that stage):

```bash
git worktree add ../himrakshak-round-1 round-1
```

Then `cd ../himrakshak-round-1 && npm install && npm run dev`.
Nothing is pushed to GitHub until the hackathon starts.

## Using AI tools on this project

| Tool | How it gets our rules |
|---|---|
| Claude Code | Reads `CLAUDE.md` automatically |
| Gemini CLI / Antigravity | `GEMINI.md` / `AGENTS.md` (if not picked up, paste `AGENTS.md`) |
| Cursor, Codex | Read `AGENTS.md` automatically |
| ChatGPT, DeepSeek (web) | Paste the whole `AGENTS.md` as your first message |

One person, one feature, one AI tool at a time. Pull before you start, push when
it runs.
