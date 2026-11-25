# Himrakshak: final redesign spec ("Milestone and Chevron")

Status: 25 Nov 2026. Repo HEAD `58baef2`. Existing tag `round-1` is pre-hackathon; do not move it. New tags are `eval-1`, `eval-2` and `eval-3`, local only, and nothing is pushed.

This spec merges the panel winner (driver-first) with the engineer judge's main rule: **extend the committed code, do not rewrite it**. The code that already works is the search planner, the 5 s and 12 s alerts with Hindi voice, the demo drive, SOS with SMS and 112, and the rescue desk. It also takes the grafts both judges agreed on: an offline road graph, real slope and history factors, distinct-device closures, a time scrubber, the /status proof page, crosshair or known-spot report placement, BRO chevrons on every simulated control, polling fallback, hold-to-send SOS, offline.html SOS, and replay of a real day.

---

## 1. Product story

A taxi driver in Rishikesh opens Himrakshak and types "badri". Google Maps would give him one road, the fastest. Himrakshak gives him two cards: **सबसे सुरक्षित · Safest** and **सबसे तेज़ · Fastest**. Each card shows km and time, and the landslide risk of every stretch *at the hour he will reach it*, built from live Open-Meteo rain × real hillside slope (Copernicus DEM) × real past landslides (NASA). He also gets a plain answer to "kab niklein?" (when to leave). While he drives, other drivers' reports (with live photos) reach his phone in seconds. A jam ahead offers a faster road for 5 seconds. Two drivers confirming a landslide ahead open a 12-second red board that picks the safest road on its own, or tells him to wait in the last safe town when no other road exists (Chamoli to Badrinath). Routing runs on the phone, so all of this works with no signal. When things go wrong, SOS sends his GPS to a rescue desk, or opens his own SMS app with the coordinates, and 112 is one tap away. Upstream, the Predict layer shows real glacial lakes that grew around 4× in 50 years above the same road. Everything is free, Hindi first, and usable with one thumb.

---

## 2. Design language: "Milestone and Chevron"

Every visual element comes from the Garhwal road itself, not from an app template.

**Palette (Tailwind theme names only).**
- `ink` #14231F: chrome, nav HUD, primary buttons.
- `snow` #F3F1EA: sheets.
- `orange` #F08A3E: milestone caps, Report button, jam alerts.
- `orange-dark` #A9481A: accent text on snow.
- `teal` #5FB3A1: low risk, clear, safe.
- `danger` #B03030 with snow text: high risk, closed, SOS.
- `muted` #4B5A55: secondary text.
- Every colour carries its word: कम खतरा Low · मध्यम खतरा Medium · ज़्यादा खतरा High · बंद Closed · जाम Jam · धीमा Slow · साफ़ Clear · जानकारी नहीं No data.

**Type.**
- Oswald, uppercase and letter-spaced, with tabular numbers for sign-like things: town names on stones, km, clock times, countdown numbers, the SAFEST and FASTEST plates.
- Public Sans for body text.
- Devanagari uses the system fallback. Add `"Noto Sans Devanagari", "Kohinoor Devanagari"` to both font stacks in globals.css; these are system fonts, so nothing is downloaded. A Devanagari web font is an open question.
- Every driver string is two lines: Hindi on top (large), English below (small, muted).

**Signature elements.**
1. **Milestone (km-stone)** `components/Milestone.tsx`: a rounded-top slab with an orange cap band carrying the NH number ("NH 7") and a snow body with the town (Hindi big, English small) and km. It is used for the next town in navigation, the head of each route card, and the stops in the ahead list.
2. **Hazard plate**: a snow triangle with a thick border (danger or orange) holding our own line icon from `lib/report-icons.ts`. A closed road is an ink rectangle plate reading "बंद · CLOSED". The same plate is used on map pins, alert headers and the legend.
3. **BRO chevrons**: ink and orange 45° stripes (`repeating-linear-gradient`; this is a stripe pattern, not a colour gradient). They are used in only two places:
   - the countdown strip in alerts, which drains left to right (`ChevronCountdown`)
   - a 6 px border on every DEMO, REPLAY or SIMULATION control or badge (`DemoTag`), so judges can see honesty at a glance
4. **Contour texture**: one inline SVG contour pattern at 6% ink, only on sheet headers, /status and offline.html.
5. **Two modes**: planning is a snow sheet over the light map. Navigation is an ink HUD (top milestone plus bottom bar) over the same map.

**Ergonomics.**
- Tap targets are at least 48 px; primary actions are 64 px.
- Fixed right rail above the sheet: SOS (56 px, danger, the word "SOS") over Report (64 px, orange, icon plus "रिपोर्ट").
- Every action sits in the bottom 60% of the screen.
- Mobile-first at 375 px. Desktop turns the sheet into a 400 px left panel.

**Banned**: purple or blue gradients, glass or blur, emoji, "Welcome to…", hero text, stock art, lorem ipsum.

**Motion**: CSS only (150–250 ms transform and opacity). Countdown strips use CSS width transitions. No ViewTransition, no animation library.

---

## 3. Information architecture

| Route | What | Owner group |
|---|---|---|
| `/` | The map app: home → search → options → nav (state shell, `RiskView`) | integration |
| `/?demo=1` | Same, plus DEMO controls (demo closure and jam, replay picker) | integration + G3/G6 |
| `/?replay=YYYY-MM-DDTHH` | Same, on a replayed real day's archived rain, with a REPLAY ribbon | integration + G6 |
| `/report` | Standalone report page (QR target for judges) | G5 |
| `/sos` | SOS (exists; precached; manifest shortcut) | G5 |
| `/dashboard` | Rescue desk (exists; English) | G5 |
| `/status` | सबूत · Proof: live source health, formula worked on a real stretch, offline matrix, data counts | G6 |
| `/offline.html` | Static fallback with SMS SOS from the last fix plus 112 | G5 |

Removed: `/api/routes` and `/api/reroute`. Routing is on the phone.

Home sheet tabs (peek 40% height): **आज का हाल** (DhamBoard plus time scrubber), **ताज़ा रिपोर्ट** (LiveReports), **खबरें** (RecentNews), **नक्शे की कुंजी** (MapLegend). Below them: InstallButton and the data footer.

Layer switch (radio): खतरा Risk | ट्रैफिक Traffic | झील Lakes.

---

## 4. Road graph (Avoid core) — `data/roads.json`

The runtime Valhalla calls are replaced by a small offline graph. It is built **once** by `scripts/build-roads.ts`, which imports the existing `lib/valhalla.ts`. It runs with `node scripts/build-roads.ts` (Node 22.23 strips types by default; put node on PATH with `export PATH="$HOME/.local/node/bin:$PATH"`). Calls go one at a time, at least 1 s apart, with `User-Agent: himrakshak-hackathon-prototype`, as the FOSSGIS terms require. The output is committed. At runtime the graph is imported statically, so routing works offline and does not depend on a public server with no uptime guarantee.

**Nodes (20).** Coordinates come from the repo route file or from OSM/Nominatim as found in research.

| id | Hindi | lat, lon |
|---|---|---|
| dehradun | देहरादून | 30.32556, 78.04368 |
| haridwar | हरिद्वार | 29.93845, 78.1453 |
| rishikesh | ऋषिकेश | 30.0869, 78.2676 |
| devprayag | देवप्रयाग | 30.146, 78.598 |
| srinagar | श्रीनगर (गढ़वाल) | 30.2232, 78.7806 |
| rudraprayag | रुद्रप्रयाग | 30.2844, 78.9811 |
| gauchar | गौचर | 30.289, 79.155 |
| karnaprayag | कर्णप्रयाग | 30.2617, 79.2187 |
| chamoli | चमोली | 30.401, 79.329 |
| pipalkoti | पीपलकोटी | 30.428, 79.43 |
| joshimath | ज्योतिर्मठ (जोशीमठ) | 30.555, 79.565 |
| badrinath | बदरीनाथ | 30.7433, 79.4938 |
| chamba | चंबा | 30.34561, 78.39432 |
| new-tehri | नई टिहरी | 30.37445, 78.43277 |
| pauri | पौड़ी | 30.14799, 78.77595 |
| kund | कुंड | 30.50491, 79.08783 |
| sonprayag | सोनप्रयाग | 30.63171, 78.99866 |
| ukhimath | ऊखीमठ | 30.51395, 79.09476 |
| chopta | चोपता | 30.4849, 79.20002 |
| gopeshwar | गोपेश्वर | 30.40878, 79.31855 |

**Stretches (22).**
- NH-7, keeping the existing ids: rishikesh-devprayag, devprayag-srinagar, srinagar-rudraprayag, rudraprayag-gauchar, gauchar-karnaprayag, karnaprayag-chamoli, chamoli-pipalkoti, pipalkoti-joshimath, joshimath-badrinath.
- Entry roads: haridwar-rishikesh, dehradun-rishikesh.
- Tehri bypass (NH-34 / NH-707A): rishikesh-chamba, chamba-new-tehri, new-tehri-srinagar.
- Pauri–Khirsu bypass: srinagar-pauri, pauri-rudraprayag. Request it with an exclude box at Sirobagad 30.2412, 78.9006 so Valhalla takes the Khirsu road. Research verified this detour as "NH309, Pauri Highway, Khirsu Road".
- Kedarnath NH-107: rudraprayag-kund, kund-sonprayag.
- Gopeshwar NH-107A bypass: kund-ukhimath, ukhimath-chopta, chopta-gopeshwar, gopeshwar-chamoli.

**Build checks.** The script fails loudly and prints the problem. It does not silently drop anything.
- A stretch's line must not pass within 1.5 km of any node other than its own two ends.
- pauri-rudraprayag must stay at least 2 km from Sirobagad.
- new-tehri-srinagar must not use rishikesh-devprayag or devprayag-srinagar (same 1.5 km test against their midpoints). If Valhalla only returns a road that does, drop that stretch, write the reason into `source`, and say so in the PR.
- The Rishikesh → Badrinath NH-7 sum should be about 296 km and about 7.3 h. Valhalla gave 296 km / 7.3 h for the normal route, and research measured Rishikesh → Srinagar as 105.9 km / 161 min. More than 10% off from these numbers is a failure.
- Chamoli → Badrinath has no bypass, and the graph must reproduce that (any closure on chamoli-pipalkoti, pipalkoti-joshimath or joshimath-badrinath leaves no path).

**Minutes** come from Valhalla `trip.summary.time`. Add a `minutes` field to `RoadRoute` in `lib/valhalla.ts`, because the current 0.1 h rounding loses 6 minutes. These are free-flow times, so the UI always says **"बिना रुके अनुमान · non-stop estimate"**. No correction factor is invented.

**Gangotri and Yamunotri are cut** before the final (scope). Their places stay searchable with `nodeId: null` and the honest line "यह सड़क अभी हमारे नक्शे में नहीं · Not on our roads yet".

---

## 5. Risk engine — `lib/risk.ts` (formula unchanged from AGENTS.md)

```
score = rain_score × slope_factor × history_factor     (0–100, capped, rounded)
rain_score     = min(100, last24h_mm × 1.5 + next6h_mm × 4)          (existing)
slope_factor   = 1 + clamp((slopeDeg − 10) / 30, 0, 1)   → 10° = 1.0, 25° = 1.5, 40°+ = 2.0
history_factor = 1 + 0.8 × min(1, (slides per 10 km) / 2) → 0 slides = 1.0, ≥2 per 10 km = 1.8
0–39 Low (teal) · 40–69 Medium (orange) · 70+ High (danger)
```

**Slope** (`scripts/build-factors.mjs`, Open-Meteo Elevation API, no key). The method follows the research recipe:
- Sample about every 1.5 km along each stretch, with at least 8 samples per stretch.
- At each road point P, also take 8 points 200 m away (N, NE … NW), with `dLat = 200/111320` and `dLon = 200/(111320·cos lat)`.
- uphillDeg = max over those 8 points of `atan(max(z_i − z_P, 0) / 200)`. The uphill maximum is used because a plain central difference cancels out across a V-shaped valley.
- slopeDeg = mean of the samples.

API limits: at most 100 coordinates per request (101 returns HTTP 400), and every coordinate counts as one call (600/min, 5,000/hour, 10,000/day). So send 100 points per request, at most 6 requests per minute, and keep the whole run under 4,500 coordinates. The script is resumable: it skips stretches that already have `slopeDeg`. Research test point: srinagar-rudraprayag vertex 30.24146, 78.9011 gave 40° uphill. Credit line: "Elevation: Copernicus DEM GLO-90 via Open-Meteo". The DEM has 90 m cells, so values are relative, not exact cliff angles; say so on /status.

**History** (`scripts/build-landslides.mjs`, modified): NASA Global Landslide Catalog (2007–2017) events within 2 km of *any* graph stretch go to `data/landslides.json`, each with `stretchId`. `slides` is the count per stretch. The catalog ends in 2017, and the UI says so.

**Rain** (`lib/weather.ts`):
- `getStretchRain(stretches)` rounds each stretch's `rainPoint` to a 0.1° cell, dedupes the cells, and makes **one** Open-Meteo multi-location call: `hourly=precipitation`, `past_days=1`, `forecast_days=3` (covers 12 h lookahead plus about 10 h trip plus a 6 h window), `timezone=Asia/Kolkata`.
- Cache with `"use cache"` and `cacheLife({ stale: 300, revalidate: 900, expire: 7200 })`.
- Budget: about 20 cells × 96 refreshes = about 1,920 location-calls a day, under the 10,000/day free limit. This number goes on /status.

**Risk at your arrival time.**
- `stretchRiskAt(stretch, rain, hourOffset)` returns the full `StretchRisk` (inputs included) for the explainer.
- `safeDepartureHour(series, nowIndex, factors, lookahead = 12, offsets?)` gains an optional `offsets` (hours until each stretch is reached). With all zeros it is exactly today's AGENTS.md rule. Route options pass ETA offsets *if the user approves* (open question 1); otherwise the integrator passes zeros.
- Delete `withSimulatedStorm` (storm simulator cut, see §13).

**Driver override.** The displayed level = max(model level, live level):
- A blocking report in the last 6 h on a stretch → at least High, with the reason in words ("ड्राइवर रिपोर्ट: भूस्खलन 20 मिनट पहले").
- A confirmed closure → "बंद · Closed".

---

## 6. Route options: Safest vs Fastest — `lib/routes.ts` (rewritten, pure, client)

`findRoutes(query)`:
- Run DFS over all simple paths on the 20-node graph. Stretches are two-way; reverse the coordinates when a stretch is driven backwards.
- Skip `closedStretchIds`.
- Add `jamMinutes` to the stretch it belongs to.
- Arrival time at each leg = `departInHours` + cumulative minutes / 60. Score each leg with `stretchRiskAt(stretch, rain, round(arriveInHours))`.
- **Fastest** = fewest minutes.
- **Safest** = lowest worstScore, then fewest highKm, then fewest minutes.
- Return at most 3: fastest, safest (one card with both plates when they are the same path), and the next distinct path by minutes when it is within 2× the fastest time.
- `safeDepartHour` per option = the first d in 0..12 where every leg, scored at d + its own offset, is below 70.
- With `rain: null`, rank by minutes only and set every risk to null. The UI then says "बारिश डेटा नहीं — सिर्फ़ समय से".
- A `RouteStart` mid-stretch (from the car) adds a virtual node with a forward edge (`kmToNode`) and a U-turn edge (`kmBack`), so alerts can offer "पीछे मुड़ें".
- No path → `[]`.

It runs in well under 50 ms on a phone; the graph is tiny.

---

## 7. Screens (375 px first; desktop = 400 px left panel plus map)

### 7.1 Home — "कहाँ जाना है?"
- **Map**: every stretch coloured by risk at the scrubber hour. Report pins (photo heads), BAND plates, NASA dots (pins at zoom 10 and above), news pins, lakes (Lakes layer only).
- **Top**: a 64 px search pill (logo + "कहाँ जाना है? · Where to?") and the layer radio under it. When offline, a banner: "ऑफ़लाइन — आखिरी सेव डेटा (14:05) · Offline, last saved data".
- **Right rail**: My location (48), Whole map (48), SOS (56), Report (64).
- **Sheet "आज का हाल"**:
  - **TimeScrubber** chips: अभी · +3 घंटे · +6 घंटे · +9 घंटे · +12 घंटे. Moving it recolours the stretches from the cached series, with no API call.
  - **DhamBoard**: 2 rows (Badrinath, Kedarnath via Sonprayag) plus greyed Gangotri and Yamunotri rows ("जल्द · coming"). Each row shows the dham's Hindi and English name, a verdict ("अभी निकल सकते हैं · Safe to leave now" / "16:00 के बाद निकलें · Leave after 16:00" / "अगले 12 घंटे यात्रा न करें · Avoid travel for 12 h"), the worst risk word and the closure count. Verdicts come from the fastest path out of Rishikesh. Tapping a row opens Options with From = Rishikesh, or the snapped GPS town.
  - Footer: "बारिश: Open-Meteo 14:05 · NASA 2007–2017 · खबरें: 41 मिनट पहले".
- **Tap a stretch** → StretchCard.

### 7.2 StretchCard (the judges' "how does it work")
- A milestone header showing from → to and km.
- 7 hour cells (now to +6 h), each with the clock time, a colour and a word.
- Formula rows with real inputs and sources:
  - "बारिश: पिछले 24 घंटे 18 mm, अगले 6 घंटे 4 mm (Open-Meteo)"
  - "ढलान: 38° → ×1.93 (Copernicus DEM)"
  - "पुराने भूस्खलन: 2 km में 7 (NASA 2007–2017) → ×1.8"
  - the equation line "28 × 1.93 × 1.8 = 97 → ज़्यादा खतरा"
- Then live reports on this stretch and the NASA events listed with year.

The numbers in the example strings are illustrations of the format only; the UI always prints computed values.

### 7.3 SearchScreen (replaces TripPlanner's selects)
- Full-height panel with an autofocused input, a back button (48 px), and a **From row**: "मेरी लोकेशन" (GPS snapped to the nearest graph node within 25 km) or a बदलें picker (Rishikesh, Haridwar, Dehradun, and any node).
- If GPS is more than 25 km from every stretch: "आप चारधाम सड़क से 38 km दूर हैं। देहरादून से शुरू करें? · You're 38 km from a Char Dham road. Start from Dehradun?" At the venue this is honest.
- **4 dham stones** (64 px): बदरीनाथ, केदारनाथ, गंगोत्री (greyed), यमुनोत्री (greyed).
- Results filter `data/places.json` locally by name, Hindi and aliases (badri/बद्री/बद्रीनाथ/बदरीनाथ, kedar/केदार, joshi/jyotirmath, agastmuni/agastyamuni, nandaprayag/nandprayag). The search works offline. Open-Meteo geocoding is not used: research found Hindi queries return 0 results and the first hits are mountain peaks.
- Kedarnath routes to Sonprayag with the note "मंदिर तक गौरीकुंड से ~16 km पैदल · ~16 km trek from Gaurikund; private cars stop at Sitapur/Sonprayag".
- Off-graph place: "यह जगह अभी हमारे नक्शे में नहीं · Not on our roads yet".

### 7.4 RouteOptions (sheet at 60% height)
- Header: "ऋषिकेश → बदरीनाथ" and a depart selector: अभी · +2 घंटे · +4 घंटे · सुरक्षित समय.
- Up to 3 cards (`RouteOptionCard`, restyled). Each card has:
  - a Milestone head with the destination and km
  - the plates सबसे सुरक्षित · SAFEST (teal) and/or सबसे तेज़ · FASTEST (ink)
  - "7 घं 18 मि · 296 km · बिना रुके अनुमान"
  - via roads
  - a **risk strip**: stretches drawn proportional to km and coloured at the arrival hour
  - the worst stretch in words: "सबसे ज़्यादा: ज़्यादा खतरा — गौचर–कर्णप्रयाग, 13:00 पर पहुँचेंगे"
  - "खतरे वाले km: 34"
  - the card's own "कब निकलें" line
- On the map the selected route is solid and risk-coloured; the others are dashed muted.
- If only one path exists: "कोई दूसरी सड़क नहीं · There is no other road".
- If every path is closed: "रास्ता बंद — <halt node> तक जाएँ और रुकें", with the Start button navigating to that halt node.
- Start: 64 px, ink, "शुरू करें · Start". The safest card is preselected.

### 7.5 Navigation (ink HUD)
- **Top**: a large Milestone ("NH 7 · श्रीनगर · SRINAGAR · 23 km · 14:20") and a one-line strip with the next thing ahead ("आगे: सिरोबगड़ 31 km · ज़्यादा खतरा · Ahead: Sirobagad 31 km · High risk").
- **Map** follows the car (pitch 0, no 3D) and shows only the active route and hazards within 30 km.
- **Bottom bar** (72 px): "पहुँचेंगे 18:40 · 284 km बाकी · Arrive 18:40 · 284 km left", the voice toggle (48), and रोकें · End (48).
- **Swipe up** for the ahead list (`TripTimeline` restyled as a column of Milestones with ETA, risk at ETA, hazards).
- **Demo**: whenever the position is simulated, a DemoTag chevron ribbon at the top edge reads "डेमो यात्रा — असली GPS नहीं · DEMO DRIVE — not real GPS", with speed chips 1× / 60× / 300× and "खतरे से 15 km पहले ले चलें · Jump to 15 km before next hazard".
- **GPS off the route** (more than 5 km) or denied: a card "आप रास्ते पर नहीं हैं (41 km दूर)। डेमो यात्रा चलाएँ? · You're not on the route. Run a demo drive?" It never pretends to be on the route.
- Real GPS uses `watchPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 })`. If the context is not secure: "GPS के लिए HTTPS चाहिए".
- Screen Wake Lock is requested on start and re-requested on `visibilitychange`.
- Every fix is saved to localStorage `himrakshak:lastFix` (lat, lon, accuracy, time), which SOS and offline.html use.
- `?demo=1` adds the chevron buttons "डेमो: आगे रास्ता बंद (simulation)" and "डेमो: आगे जाम 30 मिनट (simulation)".

### 7.6 DangerAlert (closure or high risk ahead): 12 s, auto-safest
Extends `components/NavAlert.tsx`.
- Danger sheet with a hazard plate, the report photo thumbnail if any, title, place, km ahead and arrival clock.
- Evidence line: "2 ड्राइवरों ने बताया, 18 मिनट पहले · Confirmed by 2 drivers, 18 min ago", or the rain reason for high-risk alerts.
- Up to 3 choice rows (64 px): SAFEST (preselected, with a thick snow ring), FASTEST (only if different), and WAIT "रुकें: <halt town> में, रास्ता खुलने तक".
- A ChevronCountdown strip with a 72 px Oswald number from 12 to 1.
- A text link "मेरा रास्ता रखें · Keep my route".
- Untouched for 12 s → apply `auto`, show the toast "सबसे सुरक्षित रास्ता चुना गया · Safest route selected", and speak the same line.

### 7.7 FasterRouteAlert (jam): 5 s, default stay
Same component, jam mode, orange body.
- Lines: "आगे 6 km पर जाम · ~30 मिनट · Jam ahead · ~30 min" (delay from the reporter's `delay_min`, or the TomTom delay).
- If a faster road exists: primary button "बदलें (−22 मिनट) · Switch". Secondary "इसी रास्ते पर (5) · Stay" carries the 5 s strip.
- On timeout, keep the route.
- No faster road: "आगे जाम — कोई तेज़ रास्ता नहीं, इसी रास्ते पर रहें", shown as information for 5 s.
- Unknown delay: "आगे जाम (देरी पता नहीं) · दूसरा रास्ता 1 घं 24 मि लंबा", shown as information.
- Help line: "सुरक्षा के लिए रास्ता अपने-आप बदलता है, समय के लिए कभी नहीं · Safety switches automatically, time never does."

### 7.8 HazardToast: 6 s
For a single unconfirmed blocking report ahead: "आगे 8 km: भूस्खलन की एक रिपोर्ट (5 मिनट पहले) — पुष्टि नहीं · 1 unconfirmed report". It has a photo link and no buttons, and it does not reroute.

### 7.9 ReportSheet (main screen) and /report (standalone)
1. **क्या दिखा? · What did you see?**: a 2×3 grid of 88 px hazard-plate tiles: भूस्खलन, पत्थर गिर रहे, रास्ता बंद, पानी/नाला, ट्रैफिक जाम, रास्ता खुला.
2. **कहाँ? · Where?**
   - GPS, if within 5 km of a stretch: "जगह: आपकी GPS — श्रीनगर से 6 km आगे (NH-7)".
   - Otherwise, on the main screen: crosshair mode. The sheet shrinks, a centre pin is drawn, the map pans, and the point snaps to the nearest stretch and names it ("नक्शा खिसकाकर पिन सही जगह रखें · Move the map to place the pin").
   - On /report: a list of known spots from `data/spots.json` (real chronic slide zones), plus "मेरी GPS".
   - Jam adds the delay chips 15 मि / 30 मि / 1 घं+.
3. **फ़ोटो लें · Take photo**: a 96 px button using `<input type="file" accept="image/*" capture="environment">`. The photo is resized on a canvas to a 1280 px JPEG at quality 0.7 (about 200 KB). It is optional.
4. **भेजें · Send** (64 px). There is no auto-send.

States, in words:
- "भेज दिया — सबके नक्शे पर दिख रहा है · Sent, now on everyone's map"
- for blocking kinds: "एक और ड्राइवर पुष्टि करे तो रास्ता 'बंद' माना जाएगा · One more driver confirms → marked closed"
- offline: "नेटवर्क नहीं — नेटवर्क आते ही भेजेंगे (फ़ोटो के बिना) · Will send when back, without photo" (localStorage outbox, flushed on the `online` event)
- no keys: "रिपोर्ट बंद: सर्वर जुड़ा नहीं (Supabase keys) — मदद के लिए SOS/112"

A one-line privacy note: "चेहरे और नंबर प्लेट फ़ोटो में न लें".

### 7.10 SOS (`/sos`, extend `SosPanel`)
- A 160 px danger circle "मदद चाहिए? 2 सेकंड दबाए रखें · Hold for 2 s". A ring fills while held, which prevents pocket presses.
- Kind chips: दुर्घटना · Accident | मलबे में फँसे · Trapped | बीमार · Medical | अन्य · Other. They go into `message`.
- GPS fix (15 s timeout), otherwise the last fix with its age ("आखिरी जगह: 10 मिनट पुरानी").
- Online: Supabase insert → "मदद का संदेश पहुँच गया (14:32) — रेस्क्यू डेस्क को आपकी जगह दिख रही है".
- Failed or offline: a primary "SMS भेजें · Send by SMS" link to the family number saved on this phone, otherwise `NEXT_PUBLIC_RESCUE_SMS`, labelled "डेमो रेस्क्यू डेस्क (टीम का फ़ोन) · Demo rescue desk (team phone)". The note "फ़ोन का SMS ऐप खुलेगा, 'भेजें' दबाएँ" sits next to it.
- SMS link format: `sms:NUM?&body=` (iOS: `sms:NUM&body=`, chosen by UA). The body is ASCII Hinglish under 160 characters, e.g. `SOS Himrakshak: Trapped. 30.24123,78.90061 +-20m 14:32 NH7 Srinagar-Rudraprayag maps.google.com/?q=30.24123,78.90061`.
- A permanent 64 px "112 पर कॉल करें" button (`tel:112`); keep the existing `tel:108`.
- A secondary small link "112 को SMS (Uttarakhand में पक्का नहीं)", because research did not verify SMS-to-112 in Uttarakhand.
- Unsent SOS is kept in localStorage with a retry button.

### 7.11 Rescue desk (`/dashboard`, extend `RescueDashboard`, English)
- Top counters: Open SOS (24 h) · Closed roads · Reports (12 h).
- Live badge: "Live · realtime" or "Live · polling every 10 s".
- SOS list (newest first, time ago, ±accuracy, Open in Google Maps).
- Confirmed closures (driver count, photo).
- Reports list, and the map with SOS pins (CSS pulse), closures and reports.
- Read-only: no PIN, no status writes (cut).

### 7.12 Lakes layer (Predict) and LakeCard
- Lake pins use their own SVG icon (added to report-icons).
- Tap → LakeCard: name in Hindi and English, elevation, an inline-SVG bar per year with the km² number written on each bar, the source line, growth text, risk text, downstream text, and source links.
- Tapping "नीचे की सड़क" highlights the listed NH-7 stretches.
- No polygons, no river line, no year-scrubber animation (cut).
- A separate text-only card reads "बदरीनाथ के ऊपर हिमनद (hanging glaciers) — मॉडल, चेतावनी नहीं". No zone is drawn.

### 7.13 /status — सबूत · Proof (server page, Hindi + English labels)
- **(a) Sources**, each with state and age: Open-Meteo rain (label and time, cells count) · Google News (fetchedAt, item count) · Supabase (keys present? reports in the last 24 h via a head count) · TomTom (on/off, no key) · Road graph (builtAt, 20 nodes / 22 stretches, slope range, NASA events 2007–2017) · Valhalla (build time only, not used live).
- **(b) The formula worked live** on the stretch with the highest score right now.
- **(c) Free-API budget table**: Open-Meteo about 1,920 location-calls a day out of 10,000; Elevation one-off under 4,500; Valhalla 22 calls one-off; Google News 2 RSS per hour; Supabase free plan of 500 MB DB, 1 GB storage (about 5,000 photos at 200 KB) and 200 realtime connections.
- **(d) Offline matrix**: what works with no signal (map from cache, search, route options, alerts from cached data, demo drive, report outbox, SMS SOS, 112) and what does not (fresh rain, news, live reports).
- **(e) Honest limits**: NASA ends in 2017; news pins are town-level; Valhalla times are free-flow; the DEM is 90 m.

This page is the Eval-1 architecture slide and the T-30 pre-flight check.

---

## 8. Flows (step by step)

**A. Plan.**
1. Home loads with live rain.
2. Tap the search pill or a DhamBoard row.
3. From = snapped GPS or picked town; To = place → nodeId.
4. `findRoutes`.
5. Cards appear, safest preselected.
6. The depart selector re-runs `findRoutes` with `departInHours`.
7. Start: unlock speech by speaking "यात्रा शुरू" inside the tap handler, request a wake lock, then go to nav.

**B. Navigate.**
1. GPS if within 5 km of the route; otherwise the off-route card leads to the demo drive.
2. Demo drive moves along `active.coordinates` at its minutes × speed (300× ≈ 88 s for 296 km).
3. On every position update: project onto the route (km done), set next node and arrival clock, save lastFix.
4. Check the hazards ahead.
5. Arrival within 300 m of the end → "पहुँच गए — बदरीनाथ · You've arrived" and the line "पहाड़ में जल्दी नहीं, सलामती ज़रूरी".

**C. Landslide or closure ahead (12 s).**
1. Trigger: a confirmed closure (2+ **distinct device_id** within 1 km in 12 h, no later "clear"), a demo closure, or a stretch ahead scoring 70 or more at its arrival hour (rain).
2. It fires when the hazard is anywhere ahead on the active route, **once per hazard id per trip**. Rain alerts use the key `stretchId:high` and re-fire only after the level drops and rises again.
3. Choices are computed from the car: `findRoutes` from a `RouteStart` mid-stretch, with the hazard stretch closed.
   - Halt node = the last node before the hazard. If the car is on the hazard stretch itself, the halt node is the node behind, with `uTurn: true` ("पीछे मुड़ें: श्रीनगर (6 km)").
   - For rain alerts, WAIT `untilClock` = the route's safeDepartHour clock.
4. The voice says, once and in Hindi, e.g. "सावधान। आगे इकतीस किलोमीटर पर रास्ता बंद है।". The phone vibrates `[200,100,200]`.
5. Tap → apply. No tap for 12 s → apply `auto` (SAFEST), with toast and voice.
6. **No other road** (Chamoli → Badrinath): `noBypass: true`, so WAIT becomes the default and is auto-picked. The stage becomes `halted`, with the card "कोई दूसरी सड़क नहीं — जोशीमठ में रुकें · No other road, stop at Joshimath" and "रास्ता खुलते ही बताएँगे · We'll alert you when it reopens". The destination is kept.
7. A "clear" report after the latest block (or the demo closure removed) shows the FasterRouteAlert in "रास्ता खुल गया: सिरोबगड़ · Road reopened" mode for 5 s. Its button "आगे चलें" resumes the original route; on timeout the driver stays halted with a Resume button.

**D. Jam ahead (5 s).**
1. Trigger: a driver jam report from the last 2 h within 300 m of the route ahead, TomTom current/free-flow below 0.5 on an NH-7 stretch ahead (only with the optional key), or a demo jam.
2. Delay = `delay_min`, otherwise TomTom `km/current − km/freeFlow`, otherwise **unknown**. Never a made-up number.
3. Re-run `findRoutes` with the delay added to that stretch.
4. Offer a switch only if it saves at least 10 min **and** its worst level is no higher.
5. 5 s, then stay. The voice reads one line.

**E. Report.** Report button → tile → where → photo (optional) → **Send**.
1. Upload the photo to the `report-photos` bucket, then insert the row with `device_id` (a random UUID in localStorage `himrakshak:device`) and `delay_min`.
2. Realtime INSERT reaches every map and `/dashboard` in seconds.
3. When the websocket fails to subscribe within 10 s, fall back to polling every 10 s and show the badge.

**F. SOS.** Hold for 2 s → GPS (or last fix) → Supabase insert with an 8 s abort. Success shows the time. Failure or offline shows the SMS link + 112. offline.html runs the same flow from `himrakshak:lastFix` with about 10 lines of inline JS.

**G. Replay a real day** (`?replay=2026-MM-DDTHH`, built by G6).
1. `page.tsx` loads `data/replays/<date>.json` through `lib/replay.ts` instead of live rain. The shape is the same (`StretchRain`), so nothing else changes.
2. A REPLAY ribbon with chevron border: "रीप्ले · REPLAY: <date> <hour>:00 — असली बारिश (Open-Meteo archive), यह आज का मौसम नहीं".
3. Only dates that pass §12 verification ship.

---

## 9. Exact copy for key moments (Hindi first)

| Moment | Copy |
|---|---|
| Search pill | कहाँ जाना है? · Where to? |
| Safe now | अभी निकल सकते हैं · Safe to leave now |
| Wait | 16:00 के बाद निकलें · Leave after 16:00 |
| No window | अगले 12 घंटे यात्रा न करें · Avoid travel for 12 h |
| Non-stop | बिना रुके अनुमान · non-stop estimate |
| Start | शुरू करें · Start |
| Danger title | आगे रास्ता बंद · Road closed ahead — <spot> · <n> km आगे |
| Rain danger | आगे भूस्खलन का ज़्यादा खतरा · High landslide risk ahead — <stretch>, <hh:mm> पर पहुँचेंगे |
| Countdown | 12 सेकंड में सबसे सुरक्षित रास्ता अपने-आप चुना जाएगा · Safest route auto-selected in 12 s |
| Auto picked | सबसे सुरक्षित रास्ता चुना गया · Safest route selected |
| No bypass | कोई दूसरी सड़क नहीं — <town> में रुकें · No other road, stop at <town> |
| Keep | मेरा रास्ता रखें · Keep my route |
| Jam | आगे जाम · Jam ahead — बदलें (−22 मिनट) / इसी रास्ते पर (5) |
| Demo drive | डेमो यात्रा — असली GPS नहीं · DEMO DRIVE — not real GPS |
| Off route | आप रास्ते पर नहीं हैं (<n> km दूर)। डेमो यात्रा चलाएँ? |
| Offline | ऑफ़लाइन — आखिरी सेव डेटा (<hh:mm>) · Offline, last saved data |
| Report sent | भेज दिया — सबके नक्शे पर दिख रहा है · Sent, now on everyone's map |
| SOS offline | इंटरनेट नहीं — SMS से भेजें · No internet: send by SMS |
| Call | 112 पर कॉल करें · Call 112 |
| No data | जानकारी नहीं · No data |

Voice lines are Devanagari only and short. A "आवाज़ टेस्ट करें · Test voice" button sits in the nav bar's voice menu. With no Hindi voice the alert falls back to text plus vibration, and Garhwali is not claimed. Research caveat: Android Chrome cannot reliably detect a missing Hindi pack, so install Google TTS Hindi on the demo phone before Eval 2.

---

## 10. Predict: real lakes only (data/glacial-lakes.json)

Every number below comes from the research. Nothing else may be added.

1. **Vasudhara Tal · वसुधारा ताल**
   - Location: 30.90106, 79.75438, 4,677 m. Source: Pandey A. (2026), Open Geosciences 18(1), Table 1, lake L55.
   - Areas (Pandey 2026 only; never mixed with news figures): 1972 0.137 · 1994 0.158 · 2001 0.198 · 2011 0.536 · 2023 0.572 km². The card notes "पेपर के पाठ में 2023: 0.622 km²".
   - Growth: "50 साल में ~4 गुना · about 4× in 50 years; +171% in 2001–2011 alone". Also: "USDMA 2026 फ़ील्ड टीम: ~900 m × 600 m, 38.5 m गहरी, हाल में आकार में खास बदलाव नहीं".
   - Risk: NDMA Category A (the only one in Chamoli). Held back only by moraine. USDMA installed the state's first sensor early-warning system here in 2026 (Iridium satellite, every 2 h).
   - Downstream: "रैकाणा → धौलीगंगा → मलारी, रैणी, तपोवन → विष्णुप्रयाग (NH-7, जोशीमठ के पास)". roadPoint 30.5631, 79.5765; stretchIds pipalkoti-joshimath, joshimath-badrinath.
   - Sources: doi.org/10.1515/geo-2025-0974 and the USDMA page.
2. **Balbala Lake · बालबाला झील**
   - Location: 30.9759, 79.45892, about 5,550 m (Pandey 2026 §4.1).
   - Areas: 1980 0.023 · 1994 0.084 · 2001 0.116 · 2011 0.160 · 2023 0.198 km².
   - Risk: GLOF susceptibility 0.855 ("very high"); calving ice; unstable moraine outlet.
   - Downstream: "माणा → बदरीनाथ की ओर (पेपर के अनुसार बदरीनाथ की तरफ़ बहती है)". stretchIds joshimath-badrinath.
   - Label "केवल एक शोध-पत्र में नामित · named in one paper".
3. **Chorabari Tal · चोराबाड़ी ताल (गांधी सरोवर)**
   - Location: 30.7475, 79.06083, 3,960 m. status `history`, areas `[]`.
   - Text: "16–17 जून 2013 को टूटी, 5–10 मिनट में खाली; फिर नहीं भरी। पहले ~400 m × 200 m, 15–20 m गहरी (Dobhal et al. 2013)".
   - Downstream: Kedarnath → Rambara → Gaurikund → Sonprayag → Rudraprayag; stretchIds kund-sonprayag, rudraprayag-kund.

Card footer: "उपग्रह अनुमान · satellite estimates; यह बाढ़ की चेतावनी नहीं · watch only, not a flood warning". The 1968 and 2021 figures (0.14 and 0.59 km²) from 101Reporters are **not** shown, because they would mix sources on one line.

---

## 11. Offline / PWA and every fallback

**Service worker** (`public/sw.js`, bump to `v4`):
- network-first for the app
- precache `/`, `/sos`, `/report`, `/offline.html`, icons, worker
- tile cache cap 2,500

**Manifest shortcuts**: SOS → `/sos`, रिपोर्ट → `/report`. Graph, places, spots, lakes and replays are bundled JSON.

| Dependency | If it fails |
|---|---|
| Open-Meteo forecast | Cached for up to 2 h (expire 7200). Past that the risk shows "जानकारी नहीं" and options rank by time ("बारिश डेटा नहीं — सिर्फ़ समय से"). Never a zero score. |
| Supabase not configured or paused | Reports and SOS logging off, stated in words. SOS still works by SMS and 112. Closures come from demo controls (`?demo=1`). Wake the project on 27 Nov. |
| Realtime blocked | 10 s polling, with a badge. |
| Google News RSS | Existing "news unavailable" message. |
| TomTom (no key) | Traffic uses driver reports only; other stretches show "जानकारी नहीं". TomTom only covers the 9 NH-7 stretches, as today. |
| Valhalla | Build time only; no runtime effect. |
| GPS off route or denied | Labelled demo drive. |
| No Hindi voice | Text plus vibration, and a settings line. |
| Venue Wi-Fi | Cached PWA works offline; second-carrier hotspot; laptop `npm run build && npm start`; backup video. |
| No rain in November | A real replay day (labelled), only if verified. Otherwise the live honest green map plus a demo closure. |

---

## 12. Replay verification rule (no fake data)

`scripts/build-replay.mjs <YYYY-MM-DD>` fetches 48 h of hourly precipitation for every rain cell from `https://historical-forecast-api.open-meteo.com/v1/forecast?...&start_date=&end_date=&hourly=precipitation&timezone=Asia/Kolkata`. If that endpoint errors, use `archive-api.open-meteo.com/v1/archive` and set `label` to say "ERA5 reanalysis". The output is `data/replays/<date>.json`:

```
{ date, source, fetchedAt, times: string[], cells: { "30.2,78.9": number[] } }
```

Candidate dates suggested by the proposals were 8 Jul, 6 Aug, 17 Aug and 26 Sep 2026. **None was verified by research.** A replay day ships only if both of these hold:
- the script output shows at least one stretch at 70 or more
- a team member has opened a dated news article about a closure on that road that day, and its URL goes into the replay file as `newsUrl`

The REPLAY ribbon shows the news card only when `newsUrl` is set. No backtest table is built (cut).

---

## 13. What is cut, and why

| Cut | Why |
|---|---|
| Runtime `/api/routes`, `/api/reroute`, `lib/detour.ts`, RerouteCard | Replaced by the offline graph: instant, offline, no public-server risk on stage. `lib/valhalla.ts` stays for the build script. |
| Storm simulator (`withSimulatedStorm`, StormSimulator) | Synthetic uniform rain invites "is this fake?". Replaced by the real-day replay or the honest live map. |
| ClosureSimulator | Merged into the `?demo=1` nav controls. |
| 3D terrain, DEM hillshade, ViewTransition, `experimental.useOffline` | Unverified or new sources; build risk. |
| Gangotri and Yamunotri roads | Scope; searchable as "not on our roads yet". |
| AI photo check (Gemini) | Optional hint only, after eval-3 if everything is green (open question). Never a closure witness. |
| 4 s auto-send report | An accidental tap would publish a public hazard; Send is explicit. |
| "Still there?" cards, arrival-trip seeding, /api/risk, backtest table, RouteProfile elevation strip, lake polygons and year scrubber | Time. The scale story mentions /api/risk as next. |
| Server-Action write rewrite, in-memory rate limit, PIN rescue writes | No store on Vercel; the prototype stays insert-only RLS, as today. |
| GloFAS river layer | Works (research) but is model output at 5 km; next phase. |
| Hard-coded jam delays | Use `delay_min`, TomTom, or "देरी पता नहीं". |
| sms:112 as the primary target | Not verified for Uttarakhand. |

---

## 14. Milestone plan (tags are local; `npm run build` passes before each tag)

- **eval-1, 27 Nov 20:30 (architecture + initial progress).**
  - Road graph with real slope and history built and committed.
  - Search → Options (safest vs fastest, offline) on live rain.
  - StretchCard formula and TimeScrubber.
  - New design system on home and options.
  - `/status` as the live architecture slide.
  - The existing nav, alerts and SOS still working on the new graph (G3 done) or, at worst, on the old flow kept until G3 lands.
  - Supabase keys added and schema run; one judge report appearing live.
- **eval-2, 28 Nov 06:30 (working components + integration).**
  - Nav HUD with demo drive speeds.
  - 12 s danger (with the no-bypass WAIT) and 5 s jam, 6 s toast.
  - Hindi voice.
  - ReportSheet with crosshair and `/report` with spots.
  - Distinct-device closures, realtime with polling.
  - Hold-to-send SOS + SMS + 112, offline.html SOS.
  - Rescue desk with closures.
  - Tested on a real Android phone over HTTPS (see open question 4).
- **eval-3, 28 Nov 15:00 (final, 10-minute demo).**
  - Lakes layer.
  - Verified replay day (if any).
  - Docs DEMO.md and DATA-SOURCES.md.
  - Rehearsed 3× with a backup video.
  - Pre-flight at T-30: open /status, wake Supabase, pan the whole route to warm the tile cache, second-carrier hotspot, laptop production build.

Cut order if late: replay → lakes → /status budget table → crosshair (keep the spot list) → polling badge. Never cut: options, DangerAlert, jam alert, reports, SOS.


## Build groups

### G1 · Road graph, risk engine and offline router (data + pure logic)

Owns: scripts/build-roads.ts, scripts/build-factors.mjs, scripts/build-landslides.mjs, data/roads.json, data/landslides.json, data/places.json, lib/valhalla.ts, lib/risk.ts, lib/routes.ts, lib/geo.ts, lib/weather.ts

Build the offline Char Dham road graph and make routing a pure client function, following spec §4–§6 exactly.

1. lib/valhalla.ts: add `minutes` (round(trip.summary.time/60)) to RoadRoute. Keep roadRoute's signature and behaviour.

2. scripts/build-roads.ts: run with `export PATH="$HOME/.local/node/bin:$PATH"; node scripts/build-roads.ts` (Node 22.23 strips types; import '../lib/valhalla.ts' relatively). For the 20 nodes and 22 stretches in spec §4:
- Call roadRoute once per stretch, sequentially, at least 1100 ms apart. For pauri-rudraprayag, exclude Sirobagad 30.2412,78.9006. For new-tehri-srinagar, exclude the midpoints of the two NH-7 stretches it replaces.
- Run every build check in §4 and exit non-zero with a clear message when one fails.
- rainPoint = the geometry point at half the km.
- Write data/roads.json as RoadGraph. Keep the 9 NH-7 ids, and set slopeDeg/slopeFactor/slides/historyFactor to 0/1/0/1 until step 3.
- Rewrite data/places.json as Place[] (shape in lib/contracts.ts) with every node, plus Kedarnath (30.73518,79.06687, nodeId sonprayag, note about Sitapur/Sonprayag parking and the 16 km trek from Gaurikund), Gaurikund (30.6534,79.02682, nodeId sonprayag), Mana (30.77048,79.49594, nodeId badrinath, note 'road ends 3 km past Badrinath'), Govindghat (30.61923,79.56197, nodeId joshimath), Guptkashi (30.52832,79.08178, nodeId kund), Gangotri (30.99443,78.94115, nodeId null), Yamunotri (30.99921,78.4627, nodeId null, note 'road head Janki Chatti, ~6 km trek'), Janki Chatti (30.97645,78.43834, nodeId null), Uttarkashi (30.7291,78.44035, nodeId null), Barkot (30.80861,78.20596, nodeId null).
- Aliases: lower-case Latin + Devanagari, including badri/बद्री/बद्रीनाथ/बदरीनाथ, kedar/केदार, joshi/jyotirmath/ज्योतिर्मठ, agastmuni/agastyamuni, nandaprayag/nandprayag. Srinagar must not be Kashmir: hindi 'श्रीनगर (गढ़वाल)'.

3. scripts/build-landslides.mjs: filter NASA events within 2 km of ANY stretch in roads.json, tag each with stretchId, and write data/landslides.json (same item shape as landslides-badrinath.json). Do not delete the old file; the integrator does.

4. scripts/build-factors.mjs: use the Open-Meteo Elevation API with the uphill-max recipe in §5.
- Limits: at most 100 coords per request, at most 6 requests per minute, under 4,500 coords in total. It must be resumable (skip stretches with slopeDeg > 0).
- Compute slopeDeg, slopeFactor, slides (from landslides.json), historyFactor = 1 + 0.8*min(1,(slides/km*10)/2), rounded to 2 decimals.
- Write the results back into roads.json and set builtAt/source (credit Copernicus DEM GLO-90 via Open-Meteo, NASA GLC, Valhalla/OSM).

5. lib/risk.ts:
- Add `stretchRiskAt` (StretchRiskAt) and the optional `offsets` parameter on safeDepartureHour (all zeros = current behaviour).
- Remove withSimulatedStorm only after confirming that lib/routes.ts is the last importer in your files; RiskView and StormSimulator are deleted by the integrator.
- Keep RISK_STYLE, riskLevel, rainScore and segmentScore exports unchanged.

6. lib/routes.ts: rewrite as a pure module with no 'use cache', no fetch, no valhalla import. It exports ROAD_GRAPH (from data/roads.json), PLACES (from data/places.json) and findRoutes exactly per §6, including mid-stretch RouteStart with the U-turn edge, closed stretches, jamMinutes, ETA scoring, fastest/safest/one more, and safeDepartHour per option via safeDepartureHour with offsets.

7. lib/weather.ts: keep getRain for other callers until the integrator removes them. Add getStretchRain(stretches): 0.1° cell dedupe, one multi-location call with past_days=1, forecast_days=3, 'use cache' + cacheLife({stale:300,revalidate:900,expire:7200}), returning StretchRain {source:'live', label:'Open-Meteo, HH:MM par'}.

8. lib/geo.ts: add projectOnLine(coordinates, point) → {index, kmAlong, kmOff} and pointAtKm(coordinates, km) → LatLon, bearingDeg(a,b). Keep distanceKm and nearestSegment.

Read node_modules/next/dist/docs for 'use cache'/cacheLife before editing weather.ts. Do not touch any file outside ownsFiles.

Acceptance:
- `node scripts/build-roads.ts` exits 0 and data/roads.json has 20 nodes and 22 stretches (or a stretch dropped with its reason written in `source`, reported in the hand-off)
- NH-7 Rishikesh→Badrinath stretch sum is within 10% of 296 km / 7.3 h; pauri-rudraprayag geometry stays ≥2 km from 30.2412,78.9006
- After build-factors: every slopeFactor is in [1,2], every historyFactor in [1,1.8]; srinagar-rudraprayag slides equals its count in data/landslides.json
- A throwaway scratch check (not committed) calls findRoutes on the graph: rishikesh→badrinath with no closures puts the NH-7 path first as fastest; closing srinagar-rudraprayag returns only paths without it (Pauri or Tehri side); closing joshimath-badrinath returns []; a mid-stretch start returns an option whose first leg starts at the car
- findRoutes with rain:null returns options with worstScore null and is still ranked by minutes
- safeDepartureHour(series, nowIndex, factors) with no offsets returns the same value as before for the current live data
- `npx tsc --noEmit` shows no errors in G1's files (errors in files the integrator will delete are expected and listed)
- No new npm packages; Valhalla calls ≥1 s apart with User-Agent himrakshak-hackathon-prototype

### G2 · Planning screens: search, route options, DhamBoard, stretch explainer, time scrubber

Owns: components/SearchScreen.tsx, components/RouteOptions.tsx, components/RouteOptionCard.tsx, components/DhamBoard.tsx, components/StretchCard.tsx, components/TimeScrubber.tsx, components/TripTimeline.tsx

Build the planning UI from spec §7.1–§7.4 and the copy table in §9. Everything is presentational: props in, callbacks out, no data fetching.
- SearchScreen: props {places: Place[]; from: Place|null; onFrom; onTo; onBack; gpsNode: {node: RoadNode; km: number}|null}. Includes the alias filter (case-insensitive, Devanagari ok), the 4 dham stones (Gangotri and Yamunotri greyed with 'जल्द · coming'), the From row with the GPS snap and the >25 km Dehradun prompt, the off-graph line, and the Kedarnath note.
- RouteOptions: props {from: Place; to: Place; options: RouteOption[]; selectedId; departInHours; rainLabel: string|null; graph: RoadGraph; onPick; onDepart; onStart; onBack}. It holds the depart selector (अभी/+2/+4/सुरक्षित समय), up to 3 RouteOptionCard, the 'कोई दूसरी सड़क नहीं' and all-closed halt cases, and the 64 px Start.
- RouteOptionCard (rewrite, same file): Milestone head, plates, time + km + 'बिना रुके अनुमान', via roads, a risk strip (div segments proportional to leg km, coloured by RISK_STYLE with the word), worst stretch sentence with arrival clock, high km, and the card's own kab-niklein line.
- DhamBoard: rows for Badrinath and Kedarnath from props {rows: {place: Place; option: RouteOption|null; closures: number}[]} plus greyed Gangotri/Yamunotri.
- StretchCard: props {stretch: Stretch; risks: StretchRisk[] (hour 0..6); reports: Report[]; slides: {date: string; title: string}[]; onClose}. Shows the formula rows with real numbers and sources and the equation line.
- TimeScrubber: props {hour: 0|3|6|9|12; onChange}. Radio chips, 48 px.
- TripTimeline: restyle as the 'आगे क्या है · What's ahead' list of Milestones with ETA and risk at ETA. New props {legs: PathLeg[]; graph: RoadGraph; startClock: Date; hazards: Hazard[]; focusId; onSelect}.

Use Milestone and DemoTag from G4 by import (their props are in contracts). If they do not exist yet, code against the contract and leave the import; the integrator resolves it. Hindi first, English second. Every colour has a word. Tap targets ≥48 px, primary 64 px. Must work at 375 px.

Acceptance:
- `npx tsc --noEmit` shows no errors in G2's files once G4's Milestone/DemoTag exist (contract-typed props)
- Every interactive element has min-h-12 (48 px) or larger; Start is min-h-16
- Every risk colour is rendered next to its Hindi + English word (grep: no RISK_STYLE colour used without .hindi/.label nearby)
- Typing 'badri', 'बद्री' or 'बदरीनाथ' in SearchScreen returns Badrinath; 'kedar' returns Kedarnath with the Sonprayag note; 'gangotri' shows 'Not on our roads yet'
- RouteOptions with one option shows both plates on one card and the 'कोई दूसरी सड़क नहीं' line; with zero options shows the halt message
- No emoji, no gradients other than none, no new packages; only palette classes (ink, snow, orange, orange-dark, teal, danger, muted)

### G3 · Navigation, alerts and Hindi voice

Owns: lib/trip.ts, lib/speak.ts, components/NavAlert.tsx, components/NavPanel.tsx, components/HazardToast.tsx

Extend, do not throw away, the committed trip, alert and nav code so it runs on the offline graph. Follow spec §7.5–§7.8, flows B–D, and the copy in §9.

lib/trip.ts:
- Rewrite internals to implement `useTrip` (UseTrip) and `driverHazards(reports, closures)`.
- Remove fetchOptions and the /api/routes dependency; call findRoutes from lib/routes.ts.
- From/To are Places; options are recomputed on from/to/departInHours/closures/rain change.
- GPS uses watchPosition with {enableHighAccuracy:true, timeout:20000, maximumAge:10000}, the secure-context check, and offRouteKm via projectOnLine. GPS applies only when within 5 km; otherwise source='demo' after the user accepts the off-route card. The shell renders the card from offRouteKm.
- Demo drive advances by stretch minutes × demoSpeed (1/60/300).
- Rain hazards: any leg ahead scoring ≥70 at its arrival hour; key `stretchId:high`.
- Alert selection in priority danger > jam > toast. Each hazard id alerts once per trip.
- Danger choices come from a mid-stretch RouteStart with the hazard stretch closed. Halt node = last node before the hazard, or the node behind with uTurn:true when the car is on the hazard stretch. When there is no path, noBypass:true and auto = wait.
- Jam: faster only if ≥10 min saved and no higher worst level; delay from delayMin only; unknown → otherRouteExtraMin.
- Reopen: a 'clear' after a closure that halted the trip triggers a 5 s jam-type alert in reopen mode. Add an optional `reopened: true` to the hazard id key, without changing contract types; use hazard.kind 'closure' + source.
- Stage 'halted' keeps `to`.
- Save lastFix to localStorage 'himrakshak:lastFix' ({lat,lon,accuracy,at}) on every real GPS fix and every demo tick (marked demo:true).
- Screen Wake Lock on start, re-requested on visibilitychange.
- addDemoHazard / jumpBeforeNextHazard / setDemoSpeed.

lib/speak.ts: move speak() out of NavAlert. It takes a priority, and danger cancels info. unlockSpeech() speaks 'यात्रा शुरू' inside the Start tap. hasHindiVoice() checks getVoices for a lang starting with 'hi' after voiceschanged. Prefer localService voices. navigator.vibrate([200,100,200]) on danger.

NavAlert.tsx: render TripAlert danger (12 s) and jam (5 s, incl. reopen) per §7.6–7.7 with ChevronCountdown. Countdown starts immediately, because options are local now. On timeout call onResolve with auto:true. Props {alert: TripAlert; onResolve: (r: AlertResolution) => void}.

HazardToast.tsx: 6 s toast for type 'toast'.

NavPanel.tsx: the ink HUD bottom bar + top Milestone strip props {nav: NavSnapshot; demoControls: boolean; voiceOn; onVoice; onStop; onDemoSpeed; onJump; onDemoHazard; onAcceptDemo}. Includes the DEMO DRIVE DemoTag ribbon whenever source==='demo', the off-route card, the halted card and the arrived card.

No hard-coded delays. No new packages.

Acceptance:
- `npx tsc --noEmit` shows no errors in G3's files
- lib/trip.ts no longer imports fetch/`/api/routes` or lib/valhalla (grep)
- Scratch check (not committed) of the alert selection: a demo closure on joshimath-badrinath while driving pipalkoti→joshimath yields type 'danger', noBypass true, auto.kind 'wait' at joshimath
- A demo closure on srinagar-rudraprayag while on devprayag-srinagar yields auto.kind 'route' with a path avoiding that stretch
- A jam with delayMin null yields faster:null and otherRouteExtraMin set; with delayMin 30 and no ≥10 min saving yields faster:null
- Same hazard id never produces a second alert in one trip
- NavAlert danger auto-resolves at 12 s, jam at 5 s with choice 'stay'; both expose a visible countdown number and text
- DEMO DRIVE ribbon visible whenever source==='demo'; all buttons ≥48 px

### G4 · Map and design system

Owns: components/RiskMap.tsx, app/globals.css, app/layout.tsx, components/Milestone.tsx, components/ChevronCountdown.tsx, components/DemoTag.tsx, components/MapLegend.tsx, lib/report-icons.ts, components/ReportIcon.tsx

Implement the 'Milestone and Chevron' language (spec §2) and adapt RiskMap to RiskMapProps from lib/contracts.ts.

RiskMap.tsx:
- Change Props to RiskMapProps.
- Remove the detour source/layer and detourSignal.
- Keep the existing layers, pins (report photo heads, news, NASA dots with data-far), viewPadding, locate and fit.
- Add: a `routes` source (solid or dashed by MapLine.dashed, width, ink casing); closures as an ink 'बंद · CLOSED' plate marker; demoHazards with a DemoTag-styled 'SIMULATION' marker; lakes as pins with the new lake icon (only when lakes.length>0), calling onSelectLake; car marker as an arrow rotated by heading; follow mode (easeTo car each update, pitch 0); fit when `fit` changes; focusStretchId highlight; crosshair overlay (an absolutely positioned centre pin, pointer-events none) when crosshair; onCenter on moveend.
- Stretch clicks call onSelectStretch.
- Basemap stays OpenFreeMap liberty; you may setPaintProperty a few background/water layers to palette colours after load, with each call guarded by getLayer.

Milestone.tsx (MilestoneProps): rounded-top slab with an orange cap (NH text, Oswald) and a snow body (Hindi large, English small, km in tabular Oswald). sm and lg sizes.

ChevronCountdown.tsx (ChevronCountdownProps): a chevron-striped strip draining over `seconds` via CSS width transition, a big Oswald number, an aria-live polite text 'n सेकंड', and calls onDone once. Respects paused.

DemoTag.tsx (DemoTagProps): chevron 6 px border badge.

globals.css:
- add the chevron stripe utility (repeating-linear-gradient 45deg ink/orange), the milestone shape, a contour SVG pattern class (6% ink, inline data URI), an SOS pulse keyframe, and countdown transitions
- add the Devanagari system fallbacks to --font-sans and --font-display
- palette tokens unchanged

layout.tsx: title 'Himrakshak'; fonts unchanged.

lib/report-icons.ts: add own stroke SVG icons for lake, car-arrow, u-turn, wait-clock, speaker, sos. MapLegend: add closed plate, lake, car, SOS, SIMULATION entries, each in words.

RescueDashboard has its own map; do not edit it.

Acceptance:
- `npx tsc --noEmit` shows no errors in G4's files
- RiskMap's Props type is exactly RiskMapProps (imported from lib/contracts.ts); no `detour` remains (grep)
- Milestone, ChevronCountdown and DemoTag render with only palette colours; no gradient except the chevron stripe; no blur/backdrop-filter (grep)
- ChevronCountdown calls onDone exactly once after `seconds` and shows the remaining number as text
- All new map buttons/markers that are tappable are ≥48 px
- No new npm packages; no emoji

### G5 · Reports v2 and Survive (SOS, rescue desk, offline SOS)

Owns: lib/reports.ts, components/ReportSheet.tsx, app/report/page.tsx, components/LiveReports.tsx, data/spots.json, supabase/schema.sql, lib/sos.ts, components/SosPanel.tsx, components/RescueDashboard.tsx, app/sos/page.tsx, app/dashboard/page.tsx, public/offline.html, .env.example

Follow spec §7.9–§7.11, flows E–F and copy §9.

lib/reports.ts:
- Report gains device_id: string|null and delay_min: number|null.
- Add a device id: a random UUID in localStorage 'himrakshak:device', read inside try/catch.
- sendReport(draft):
  - Resize the photo on a canvas to a 1280 px JPEG at q 0.7, then upload, then insert.
  - Offline (navigator.onLine false) → localStorage outbox without the photo and return 'queued'; flush on the window 'online' event.
  - No supabase client → 'off'.
- useReports() returns {reports, mode}: realtime first; if not SUBSCRIBED within 10 s or CHANNEL_ERROR, poll every 10 s → mode 'polling'.
- confirmedBlocks: 2+ DISTINCT device_id (null ids count as one each by report id) within 1 km in 12 h with no later clear; return ClosedSpot with drivers and photoUrl.
- Keep recentJams and timeAgo.
- Remove createReport/NewReport once ReportSheet uses sendReport (ReportForm is deleted by the integrator).

ReportSheet.tsx: props {stretches: Stretch[]; mode: 'embedded'|'standalone'; mapCenter: LatLon|null; onCrosshair: (on: boolean) => void; onClose}. Contents:
- 88 px plate tiles
- where: GPS within 5 km, else crosshair (embedded) or the spot list from data/spots.json (standalone), snapped to the nearest stretch with nearestSegment
- jam delay chips
- capture=environment photo
- explicit Send
- every status in words, including 'Reports off' and the privacy line

app/report/page.tsx: a standalone page rendering ReportSheet mode 'standalone' with ROAD_GRAPH stretches.

data/spots.json (Spot[], from the research chronic zones, exact coordinates):
- Sirobagad 30.2412,78.9006
- Kaliasaur 30.25795,78.88007
- Pagal Nala 30.4786,79.4679
- Patal Ganga 30.4871,79.4841
- Lambagad 30.69264,79.51324
- Munkatiya 30.65154,79.02471
- Tilwara 30.34556,78.97639
- Nandprayag 30.3299,79.3206
- Vishnuprayag 30.5631,79.5765
- Shivpuri 30.135,78.3896
- Gulabkoti 30.50415,79.48751

Each entry has its Hindi name, road and source text.

LiveReports: show drivers count / 'पुष्टि नहीं' and the delay for jams.

supabase/schema.sql: idempotent `alter table reports add column if not exists device_id text, add column if not exists delay_min int check (delay_min between 0 and 600)`. The sos table is unchanged.

lib/sos.ts: add smsHref(number, body) (iOS UA → '&body=', else '?&body='), an ASCII ≤160-char body builder (kind, coords 5 dp, ±m, HH:MM, nearest stretch name, maps.google.com/?q=), saveLastFix/readLastFix ('himrakshak:lastFix').

SosPanel: hold-to-send 2 s ring; kind chips; last-fix fallback with age; primary SMS to the family number or NEXT_PUBLIC_RESCUE_SMS (labelled demo desk); 64 px tel:112; keep tel:108; secondary 'SMS to 112 (not guaranteed in Uttarakhand)'; retry for unsent.

RescueDashboard: counters, closures list (confirmedBlocks), a realtime/polling badge, the SOS pulse (CSS class from globals is owned by G4 — use the class name 'sos-pulse'). Read-only.

public/offline.html: add a 56 px tel:112 and an 'SMS से SOS' link built by ~10 lines of inline JS from 'himrakshak:lastFix' (shows its time), using NEXT_PUBLIC_RESCUE_SMS is impossible in static HTML so use the saved family number 'himrakshak-sos-contact' or show 'नंबर सेव नहीं — 112 पर कॉल करें'.

.env.example: add NEXT_PUBLIC_RESCUE_SMS (demo desk number, labelled).

Acceptance:
- `npx tsc --noEmit` shows no errors in G5's files
- schema.sql runs twice in Supabase SQL editor without error (idempotent)
- With Supabase keys missing, ReportSheet shows 'रिपोर्ट बंद: सर्वर जुड़ा नहीं' and SOS still offers SMS + tel:112
- confirmedBlocks: two reports from the same device_id within 1 km do NOT close the road; two different device_ids do; a later 'clear' reopens
- smsHref body is pure ASCII and ≤160 characters for a realistic fix (unit check in a scratch file)
- Report Send requires an explicit tap (no timer auto-send); photo input uses capture="environment"
- /report renders the spot list including Sirobagad 30.2412,78.9006
- offline.html works with no JS bundle and no network (static, inline script only)

### G6 · Predict lakes, /status proof page, real-day replay, PWA and docs

Owns: data/glacial-lakes.json, components/LakeCard.tsx, app/status/page.tsx, lib/replay.ts, scripts/build-replay.mjs, data/replays/, components/DemoPanel.tsx, public/sw.js, app/manifest.ts, lib/slide-news.ts, docs/DATA-SOURCES.md, docs/DEMO.md, README.md

Follow spec §7.12, §7.13, §10, §11, §12.

1. data/glacial-lakes.json: exactly the 3 lakes in §10 as GlacialLake[], with the numbers, sources and texts given there and nothing else. Do not include the 1968/2021 news figures.

2. LakeCard.tsx: props {lake: GlacialLake; onHighlight: (stretchIds: string[]) => void; onClose}. Inline SVG bars with the km² written on each bar, the source line, growth/risk/downstream texts, source links, and the footer 'उपग्रह अनुमान · यह बाढ़ की चेतावनी नहीं'. Chorabari renders its history text instead of bars. Also export a small `HangingGlacierNote` in the same file with the DTE Hindi text: model not a warning; worst case about 398 buildings, 2.66 km of road, 2 bridges; no zone drawn; source URL.

3. lib/replay.ts + scripts/build-replay.mjs per §12. The script takes dates as args, takes cells from data/roads.json rainPoints rounded to 0.1°, and writes data/replays/<date>.json. lib/replay.ts statically imports the replay files that exist, exports REPLAY_DATES (with newsUrl) and getReplayRain(stretches, 'YYYY-MM-DDTHH') → StretchRain with source 'replay' and label 'REPLAY · <date> <HH>:00 — असली बारिश (Open-Meteo archive)'. Run the script for candidate dates. Commit only files that pass the §12 rule; put the verified newsUrl in by hand. If none passes, ship lib/replay.ts with REPLAY_DATES = [] and say so in the hand-off.

4. DemoPanel.tsx (only rendered by the shell with ?demo=1): a chevron-bordered drawer with a replay date+hour picker that navigates to ?demo=1&replay=..., and a line listing what is simulated. Demo closure/jam buttons live in NavPanel (G3), not here.

5. app/status/page.tsx: a server page with Suspense per §7.13, reusing getStretchRain, getSlideNews, getTraffic(enabled), a Supabase head count of reports in the last 24 h (via lib/supabase client; 'off' if null), ROAD_GRAPH stats, the formula worked on the top-scoring stretch now, the API budget table, the offline matrix and honest limits. Read the Next 16 docs for cacheComponents/Suspense first.

6. lib/slide-news.ts: extend PLACES with Kund, Ukhimath, Guptkashi, Sonprayag, Gaurikund, Pauri, Tilwara, Agastyamuni, Chopta, Gopeshwar, using coordinates from data/roads.json / spec. Delete the OTHER_ROUTE Kedarnath exclusion (Kedarnath road is on the map now). Keep the hourly cache.

7. public/sw.js: VERSION v4; precache /, /sos, /report, /offline.html, icons, worker.

8. app/manifest.ts: shortcuts SOS → /sos and रिपोर्ट → /report.

9. Docs: DATA-SOURCES.md (Elevation API method and credit, NASA, Valhalla build-time, lakes with sources, replay rule, API budget); DEMO.md (the demo script, T-30 pre-flight, 2-minute smoke test per tag); README (eval-1/2/3 tags, ?demo=1 and ?replay= URLs, Supabase wake-up note).

Acceptance:
- `npx tsc --noEmit` shows no errors in G6's files
- data/glacial-lakes.json contains exactly Vasudhara Tal, Balbala Lake, Chorabari Tal with the §10 numbers (grep 0.572, 0.198, 0.137) and no 0.59/0.14 figures
- GET http://localhost:3000/status returns 200 and lists Open-Meteo, Google News, Supabase, TomTom and Road graph each with a state word
- Every file in data/replays/ has a non-null newsUrl that a team member opened, or REPLAY_DATES is []
- sw.js VERSION is v4 and PRECACHE includes /report; manifest has 2 shortcuts
- lib/slide-news.ts no longer contains OTHER_ROUTE (grep)
- No new npm packages

## Integration

The integrator owns app/page.tsx, components/RiskView.tsx (the state shell), lib/contracts.ts, AGENTS.md, docs/REDESIGN-SPEC.md and every deletion.

STEP 0, before the groups start: create lib/contracts.ts verbatim from sharedContracts (tsc-checked against HEAD) and commit it alone ("contracts for redesign").

STEP 1, app/page.tsx (server):
- Import ROAD_GRAPH from lib/routes.ts.
- Read `searchParams` (await it, per Next 16 docs). If `replay` is set and getReplayRain(ROAD_GRAPH.stretches, replay) returns data, use it; otherwise `await getStretchRain(ROAD_GRAPH.stretches).catch(() => null)`.
- Fetch in parallel getSlideNews().catch(()=>null) and getTraffic(the 9 NH-7 stretch rainPoints).catch(()=>null), as today.
- Render <RiskView rain={rain|null} news traffic demo={searchParams.demo==='1'} replayLabel/>.
- Rain null no longer blocks the page: RiskView shows 'जानकारी नहीं' and routes by time only.

STEP 2, components/RiskView.tsx (rewrite as a shell that only wires, no business logic):
- `const {reports, mode} = useReports()`; `closures = confirmedBlocks(reports)`; `const trip = useTrip({graph: ROAD_GRAPH, places: PLACES, rain, hazards: driverHazards(reports, closures)})`.
- State: layer ('risk'|'traffic'|'lakes'), scrubHour (0/3/6/9/12), sheetTab, focusStretchId, lakeId, reporting (bool), crosshair (bool), mapCenter, voiceOn, locate and fit signals.
- Stretch colours:
  - risk layer: stretchRiskAt(s, rain, scrubHour), overridden to High by a blocking report in the last 6 h and to Closed by closures
  - traffic layer: the existing trafficLevel/TRAFFIC_STYLE for NH-7 stretches and 'No data' elsewhere
- Map routes:
  - stage 'options': every option (selected solid, risk colour; others dashed muted)
  - stage 'nav' or 'halted': the active route only
- Render <RiskMap {...RiskMapProps}>, with lakes passed only when layer==='lakes', follow={stage==='nav'}, crosshair.
- Top: search pill (opens trip.openSearch), layer radio, offline banner, REPLAY DemoTag ribbon when rain.source==='replay'.
- Right rail: SOS Link (/sos, 56 px), Report button (64 px; opens ReportSheet embedded, toggles crosshair via onCrosshair), locate, fit.
- Sheet by stage:
  - idle: tabs आज का हाल (TimeScrubber + DhamBoard rows from findRoutes rishikesh→badrinath and rishikesh→sonprayag), ताज़ा रिपोर्ट (LiveReports + live mode badge), खबरें (RecentNews), कुंजी (MapLegend); then InstallButton and the data footer with rain.label
  - search: SearchScreen
  - options: RouteOptions
  - nav, halted, arrived: NavPanel with TripTimeline as the swipe-up ahead list
- StretchCard when focusStretchId is set; LakeCard (+ HangingGlacierNote) when lakeId is set.
- Overlays: NavAlert for danger/jam, HazardToast for toast, at the top on phones (left 432 px on desktop).
- Start button: call unlockSpeech() then trip.start(). When an alert appears and voiceOn, speak its first Hindi line with priority by type.
- DemoPanel only when demo===true. NavPanel gets demoControls={demo}.

STEP 3, delete the dead files listed in deleteFiles. Remove getRain if nothing else imports it, and nearestSegment if unused. Run `npx tsc --noEmit`, `npm run lint` and `npm run build` until clean. Run the app at 375 px and on desktop and fix any console errors.

STEP 4:
- Write this spec to docs/REDESIGN-SPEC.md.
- Update AGENTS.md only where the user approved: the ETA-aware safe-time sentence (open question 1), the folder layout line for api/ (now only what exists), and fonts if Q2 is approved. If Q1 is not approved, pass offsets of zeros in lib/routes' safeDepartHour call (a one-line change, coordinated with G1).
- Commit locally per finished feature and tag eval-1 / eval-2 / eval-3 at each evaluation after a green build. No push.

Wiring order if groups land at different times: G1 → G4 → G2 → G3 → G5 → G6. Until G3 lands, keep the old NavAlert/NavPanel flow compiling against the new routes only if trivial; otherwise ship eval-1 with planning only and say nav is next.

## 10-minute demo

- Before the demo (T-30). Open /status and check every source is green or knowingly off. Wake Supabase. Pan the whole NH-7 route on both phones to warm the tile cache. Have the second-carrier hotspot on. Laptop runs a production build. Backup video is on the desktop. Hindi TTS voice is installed on the Android phone. The /report QR is on the slide.
- 0:00–1:00 Problem (one slide, numbers the team has sourced for the deck). 'Google Maps knows the fastest road. Nobody tells a taxi driver which road is safe, or when to leave.' Name Sirobagad, Lambagad and Pagal Nala as chronic slide zones on NH-7.
- 1:00–2:15 Live, today. Phone mirrored on the projector, home map. Say it plainly: 'November, no rain, live Open-Meteo, so it is green.' Tap Srinagar–Rudraprayag. The StretchCard shows the formula with today's real rain × its real DEM slope factor × history factor from its NASA slide count, with sources. Drag the TimeScrubber to +6 घंटे: still honest.
- 2:15–3:15 Only if a verified replay day exists: open ?replay=<date> and the chevron REPLAY ribbon says 'असली बारिश, यह आज का मौसम नहीं'. Drag the hour and watch stretches turn red with words. Tap the verified news card for that day. If no day passed verification, skip this and show /status for 60 s: sources, the API budget (₹0, about 1,920 Open-Meteo calls a day out of 10,000), the offline matrix.
- 3:15–4:30 Plan. Search 'बद्री', From = मेरी लोकेशन. The honest prompt 'आप चारधाम सड़क से N km दूर हैं — देहरादून से शुरू करें?' appears; tap yes. The cards show FASTEST NH-7 (about 296 km, non-stop estimate) and the SAFEST card. If both are the same path under today's dry weather, say so: 'same road is both, because today it is safe.' Change depart to +4 h. Tap Start (the Hindi voice says 'यात्रा शुरू').
- 4:30–6:00 Live reports. The off-route card leads to the DEMO DRIVE ribbon at 300×. A judge scans the QR and opens /report, picks 'Sirobagad' from the spot list, taps भूस्खलन, takes a photo, presses भेजें. Within seconds the pin with the photo appears on the projector and the presenter's phone shows the 6 s toast 'एक रिपोर्ट — पुष्टि नहीं'. A second judge's phone (a different device) reports the same spot. The road is now 'बंद · CLOSED' on every map and on /dashboard.
- 6:00–7:00 The 12-second board. Tap 'खतरे से 15 km पहले' (DEMO). The red DangerAlert shows 'आगे रास्ता बंद — सिरोबगड़', '2 ड्राइवरों ने बताया', the photo, and the SAFEST and FASTEST rows plus WAIT. The chevron strip counts down from 12 and the Hindi voice speaks. Nobody touches it, and it auto-picks the safest road (via Pauri–Khirsu or Tehri, whichever the graph returns), saying 'सबसे सुरक्षित रास्ता चुना गया'. Fallback if Wi-Fi or Supabase fails: '?demo=1 → डेमो: आगे रास्ता बंद (simulation)', which gives the same board with the SIMULATION tag.
- 7:00–7:40 No other road, and a jam. Use the demo closure (SIMULATION) on Joshimath–Badrinath. The board says 'कोई दूसरी सड़क नहीं — जोशीमठ में रुकें' and WAIT is auto-picked at 12 s. Then the demo jam of 30 min (SIMULATION): the orange 5 s card says 'कोई तेज़ रास्ता नहीं, इसी रास्ते पर रहें'. Rule: safety switches automatically, time never does.
- 7:40–8:40 Survive. Airplane mode on: the map, options and the closure reroute still work (graph on the phone). Hold SOS for 2 s. The text 'इंटरनेट नहीं — SMS से भेजें' opens the SMS app with coordinates, addressed to the team phone labelled 'demo rescue desk'; press Send and show it arriving. Show the 112 call button. Wi-Fi back on: the laptop /dashboard shows the SOS pin pulsing, the closure from the judges, and the report photos.
- 8:40–9:20 Predict. Lakes layer: Vasudhara Tal 0.137 km² (1972) → 0.572 km² (2023) with Pandey 2026 named on the card, NDMA Category A, the 2026 USDMA early-warning system, downstream to Vishnuprayag on NH-7. Also say USDMA's field team saw no notable recent change. Tap Chorabari: 2013, the lake that already broke. Say 'watch only, not a flood warning'.
- 9:20–10:00 Feasibility and close. ₹0 stack with no card; works with no keys; a new corridor = a node list plus 3 scripts. Scale path: self-hosted Valhalla, Supabase Pro, a /api/risk feed for control rooms (next). Close on 'Predict. Avoid. Survive.' and leave /status open for questions.

## Open questions for the team lead

- ETA-aware 'safe time to leave' (each stretch checked at the hour you reach it) changes the AGENTS.md definition. Approve the change and the AGENTS.md update, or keep the current all-stretches-now rule (one argument change)?
- Devanagari font: Oswald and Public Sans have no Hindi glyphs, so the phone's system font is used. Add Noto Sans Devanagari through next/font/google (no npm package, but it changes the AGENTS.md font rule), or stay with the system font?
- Supabase: who creates the free project and adds NEXT_PUBLIC_SUPABASE_URL and the publishable key to .env.local before Eval 1, and runs supabase/schema.sql? Without it, live reports, distinct-device closures, SOS logging and the rescue desk stay off.
- Phone GPS, Wake Lock and the judges' QR need HTTPS. Is a Vercel deploy (Vercel CLI from the laptop, so no git push) allowed before Eval 2, or do we test with chrome://flags on the phone and the localhost demo only?
- Whose phone number is the labelled 'demo rescue desk' for NEXT_PUBLIC_RESCUE_SMS, so the offline SMS SOS can be shown arriving live?
- Replay: which real 2026 monsoon dates do you want tried (the proposals suggested 8 Jul, 6 Aug, 17 Aug, 26 Sep), and who will open and confirm a dated closure news link for each before it ships? With no verified day, the demo uses the live map plus labelled demo closures only.
- AI photo check (Gemini free tier, optional key, hint only, never a closure witness): build it after eval-3 core is green, or drop it and correct the deck?
- Hackathon rules on pre-built code: are local tags eval-1/2/3 plus honest commit history what the organisers expect? The existing round-1 tag stays untouched.
- Gangotri and Yamunotri roads are cut until after the final (they stay searchable as 'not on our roads yet'). OK, or is one of them a must for the pitch?
- The deck's claims need to match the product (Hindi voice, not Garhwali; Valhalla used at build time; 2-driver confirmation; Gemini optional). Who updates the slides, and by when?
