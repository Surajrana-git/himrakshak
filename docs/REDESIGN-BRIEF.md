# Redesign brief (next step)

Status on 25 Nov 2026: **not built yet**. This file is the brief for the full redesign,
so any AI tool (Claude Code, Antigravity, ChatGPT, DeepSeek) can pick it up.
Follow `AGENTS.md` for every rule. Keep everything free and local (no git push).

## Goal: win all 8 judging targets

1. Innovation & Originality 2. Problem Relevance 3. Technical Implementation
4. Creativity & Design 5. Feasibility & Scalability 6. Impact 7. Presentation & Pitch
8. Something working and demo-able at each evaluation (27 Nov 8:30 PM, 28 Nov 6:30 AM, 28 Nov 3 PM).

## What the team lead asked for

- **Google Maps flow**: search "Kahan jaana hai?" → route options labelled
  *Sabse surakshit / Safest* and *Sabse tez / Fastest* (km, time, risk in words) → **Start**.
- **While travelling**:
  - Traffic jam ahead → popup for **5 seconds** with a faster route if one exists
    ("Aage jaam hai · Doosra rasta: +X km, Y min bachega"). Timeout = stay on route.
  - Landslide / road closed ahead → popup for **12 seconds** with a countdown, listing safe and
    fast options. Timeout = auto-pick the safest. No alternative road = "Koi doosra rasta nahi —
    pichhle surakshit town mein rukein" and show that town.
  - Spoken Hindi alert (browser `speechSynthesis`, `hi-IN`, free).
- **Waze-like live map**: own hazard icons, driver reports with live photo, realtime, traffic
  colours (clear / slow / jam / closed / no data).
- Recent data hourly, real past landslides (NASA), live rain (Open-Meteo).
- Distinctive UI, PWA, Hindi first, 48px targets, mobile first.

## Team plan layers

- **Avoid (core)**: done — risk map, safe time to leave, reports, reroute, traffic layer.
- **Predict (light)**: 2–3 real glacial lakes (e.g. Vasudhara Tal near Mana, Chorabari Tal above
  Kedarnath) with area over time **only from cited sources**.
- **Survive (light)**: SOS button → GPS saved to Supabase when online; offline → `sms:` link with
  coordinates + `tel:112`. Rescue dashboard page (reports + SOS on one map, English ok).

## Building blocks already in the code

| Need | Use |
|---|---|
| Route between any two points, avoiding closed spots | `lib/valhalla.ts` → `roadRoute(from, to, closedPoints)` (free Valhalla server) |
| Detour on NH-7 | `lib/detour.ts`, `GET /api/reroute?blocks=lat,lon;...` |
| Rain risk | `lib/weather.ts` (`getRain(points)` works for any points), `lib/risk.ts` |
| Hazard icons / pins | `lib/report-icons.ts`, `components/RiskMap.tsx` |
| Reports + "closed" rule (2 reports within 1 km in 12 h) | `lib/reports.ts` |
| Traffic | `lib/traffic.ts` (TomTom, optional key), `lib/traffic-status.ts` |
| News, NASA history | `lib/slide-news.ts`, `data/landslides-badrinath.json` |

Valhalla's public server returned **no `alternates`** in a test, so make route options yourself:
the direct route, plus the direct route with its middle part excluded (that finds the real
alternatives: Tehri NH707A, Pauri–Khirsu, Ukhimath–Gopeshwar NH107A). Chamoli → Badrinath has
no alternative road.

## Build order (one feature at a time, run it, then the next)

1. `GET /api/routes?from=&to=&closed=` → 1–3 options with km, hours, roads, rain risk along the
   route (sample points every ~25 km → `getRain`). Label safest / fastest.
2. Search panel (towns list or Open-Meteo geocoding API, free) + route options sheet.
3. Navigation mode: car marker, GPS `watchPosition`, plus a clearly labelled **Demo drive**
   (the venue in Dehradun is not on the route).
4. Alerts: hazards ahead on the active route → jam popup 5 s, landslide popup 12 s, voice.
   Demo buttons "Demo: aage jaam" / "Demo: aage landslide" (labelled).
5. Survive: `/sos` + rescue dashboard. 6. Predict: lake layer with sourced numbers.

A design workflow (3 competing redesigns + 2 judges + research on lakes, free APIs and
Char Dham places) was started on 25 Nov; its spec, if it finished, should replace this brief.
