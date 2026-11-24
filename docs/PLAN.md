# Build plan

Build window: 27 Nov 10:30 AM → 28 Nov 4:30 PM (on site).
Check the hackathon rules for what may be prepared before 27 Nov. Safe to do now:
this setup, accounts, studying the APIs, collecting public data.

## Roles

| Person | Owns | Main files |
|---|---|---|
| Suraj Kumar (lead, full stack) | Map screen, Supabase, reports, realtime, risk engine | `app/`, `lib/risk.ts`, `lib/supabase.ts`, `app/api/risk` |
| Gautam Yadav (design) | UI/UX in code (colours, layout, mobile), PPT | `components/`, Tailwind theme, pitch deck |
| Suryadeep Kumar Jha (pitch) | Demo script, rehearsals, backup video, testing on real phones | `docs/`, demo |
| Gaurav Kumar Verma (data + AI) | Route/landslide/glacier data, AI photo check, voice alerts, SMS SOS | `data/`, `app/api/photo-check`, `app/api/sms`, `app/sos` |
| [5th member?] | Rescue dashboard, extra testing | |

## Milestones (match the 3 evaluations)

### Evaluation 1 — 27 Nov, 8:30 PM: "it works on a map"
- [ ] Map of Rishikesh → Badrinath / Kedarnath routes, split into segments
- [ ] Risk colour per segment from live Open-Meteo rain
- [ ] Driver report: tap → photo → appears on everyone's map (Supabase realtime)
- [ ] Architecture slide ready to show

### Evaluation 2 — 28 Nov, 6:30 AM: "it makes decisions"
- [ ] Next-6-hours risk + "safe time to leave"
- [ ] AI checks report photos (blocked road? yes/no + confidence)
- [ ] SOS button: sends GPS; SMS fallback when offline
- [ ] Deployed on Vercel, works on a real phone

### Final demo — 28 Nov, 3:00 PM (10 minutes)
- [ ] Glacier lake layer (2–3 real lakes, size over time)
- [ ] Hindi / Garhwali voice alert
- [ ] Rescue dashboard (reports + SOS on one map)
- [ ] Rain slider for the demo (clearly labelled "simulation")
- [ ] Demo rehearsed 3 times, backup video recorded

## Demo script (10 minutes)

1. (1 min) Problem: July 2026 numbers.
2. (5 min) Live: route turns orange → safe-time alert → judge sends a report from
   their phone → it appears live → rain slider turns roads red → SOS goes out.
3. (2 min) Glacier layer + architecture.
4. (2 min) Impact, roadmap, questions.

Always have a recorded backup video in case Wi-Fi fails.
