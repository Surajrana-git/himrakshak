<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Himrakshak — rules for every AI tool

This file is the single source of rules for **every** AI assistant on this team:
Claude Code, Antigravity, Cursor, ChatGPT, DeepSeek, Gemini, anything else.
For chat tools (ChatGPT, DeepSeek), paste this whole file as your first message.

## What we are building

Himrakshak: disaster safety for Himalayan roads. Three layers:

1. **Avoid (CORE, must fully work):** a live map of Char Dham routes. Each road
   stretch gets a risk level for now and the next 6 hours, plus a "safe time to
   leave". Drivers report blockages with a photo.
2. **Predict (light):** a map layer showing 2–3 real glacial lakes and how fast
   they are growing.
3. **Survive (light):** SOS with GPS that falls back to SMS when there is no data.

Judges see this at 3 evaluations (27 Nov 8:30 PM, 28 Nov 6:30 AM, 28 Nov 3 PM).
Something must **work and be demo-able** at each one. Working beats impressive.

## Stack (do not add to it without asking the team)

- Next.js (App Router) + React + TypeScript
- Tailwind CSS for styling
- Supabase: Postgres, realtime, storage for photos
- MapLibre GL JS with free OpenStreetMap tiles
- Open-Meteo API for rain (free, no key)
- Deploy on Vercel

**Do not install** any other UI kit, state library, ORM, chart library or
animation library. Ask first. Every extra package is more to break.

## Folder layout

```
app/                  pages and API routes (Next.js App Router)
  page.tsx            the map screen (main demo)
  report/             driver report flow
  sos/                SOS flow
  api/                server routes (risk, sms, photo-check)
components/           React components, one per file
lib/                  plain functions: risk.ts, weather.ts, supabase.ts
data/                 static JSON: routes, landslide points, glacier lakes
docs/                 plan and notes (not code)
```

Keep it flat. No `utils/helpers/common` dumping folders.

## How to write code here

- **Small and direct.** Write the simplest code that works. No abstractions,
  factories, wrappers or "for future use" code. Three similar lines beat a
  premature helper.
- **No dead code.** Delete unused imports, functions, files and commented-out code
  before you finish.
- **No placeholder logic.** Never fake data with `Math.random()` or hard-coded
  "demo" values in the real flow. If data is missing, say so in the UI.
- **TypeScript, but light.** Type function inputs and outputs. No `any`. No giant
  type hierarchies.
- **Server vs client.** Secrets (Supabase service key, AI keys, SMS keys) only in
  server code (`app/api/*`), read from `process.env`. Never in a client component.
- **Errors.** Handle the error a user can hit (no network, API down) with a clear
  message. Do not wrap everything in try/catch "just in case".
- **Names.** Plain English: `getRiskForSegment`, `RainForecast`. Files in
  kebab-case, components in PascalCase.
- **Comments** only to explain *why*, never *what*.
- **One change at a time.** Finish one feature, run it, then start the next.
  Do not rewrite files you were not asked to touch.

## Risk engine (lib/risk.ts)

Keep it explainable — judges will ask how it works.

```
score = rain_score × slope_factor × history_factor     (0–100, capped)

rain_score     = from Open-Meteo: rain in last 24 h + forecast next 6 h
slope_factor   = 1.0 flat … 2.0 very steep (from route data)
history_factor = 1.0 none … 1.8 many past landslides within 2 km

0–39 Low (green) · 40–69 Medium (orange) · 70+ High (red)
```

"Safe time to leave" = the earliest hour in the next 12 hours where every
segment on the route is below 70.

## UI and design rules (no generic AI look)

- Colours (use these Tailwind theme names only):
  - `ink` #14231F (dark background, main text on light)
  - `snow` #F3F1EA (light background)
  - `orange` #F08A3E (warning, accent) · `orange-dark` #A9481A (accent on light)
  - `teal` #5FB3A1 (safe / OK)
  - Risk: green = teal, medium = orange, high = #D64545
- Fonts: **Oswald** for headings, **Public Sans** for text.
- **Never:** purple/blue gradients, glassmorphism, emoji as icons, "Welcome to…"
  hero text, rocket emojis, lorem ipsum, stock "AI" illustrations.
- Big tap targets (min 48px). A taxi driver must be able to use it with one hand.
- Hindi first where text is shown to drivers; English is fine for the dashboard.
- Every colour meaning must also be written in words ("High risk"), never colour alone.
- Mobile first: design for a 375px wide phone, then desktop.

## Before you say "done"

1. It runs (`npm run dev`) with no errors in the terminal or browser console.
2. `npm run build` passes.
3. You removed anything unused.
4. You told the human exactly what changed and what is not finished.
