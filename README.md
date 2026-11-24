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

## Using AI tools on this project

| Tool | How it gets our rules |
|---|---|
| Claude Code | Reads `CLAUDE.md` automatically |
| Gemini CLI / Antigravity | `GEMINI.md` / `AGENTS.md` (if not picked up, paste `AGENTS.md`) |
| Cursor, Codex | Read `AGENTS.md` automatically |
| ChatGPT, DeepSeek (web) | Paste the whole `AGENTS.md` as your first message |

One person, one feature, one AI tool at a time. Pull before you start, push when
it runs.
