// Train the landslide "AI check" for each route stretch. Run: node scripts/train-landslide-model.mjs
// Writes data/landslide-model.json. No libraries: plain logistic regression.
//
// Method:
// 1. NASA LHASA (github.com/nasa/lhasa, Kirschbaum & Stanley 2018): a 7-day antecedent rainfall
//    index, ARI = Σ R(t-i)·(i+1)^-2 / Σ (i+1)^-2, i = 0..6, compared with that place's 95th
//    percentile ARI from a long rain record (here 2001–2020, Open-Meteo ERA5 archive).
// 2. A logistic regression trained on the NASA Global Landslide Catalog events on our road
//    (data/landslides-badrinath.json) to weigh: ARI ÷ ARI95, today's rain, 14-day rain, monsoon month.
//    Trained on 2010–2014, tested on 2015–2017 (years it never saw).
import { readFileSync, writeFileSync } from "node:fs";

const route = JSON.parse(readFileSync("data/route-badrinath.json", "utf8"));
const slides = JSON.parse(readFileSync("data/landslides-badrinath.json", "utf8")).landslides;
const WEIGHTS = Array.from({ length: 7 }, (_, i) => (i + 1) ** -2);
const WSUM = WEIGHTS.reduce((a, b) => a + b, 0);

async function dailyRain(points, start, end) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    start_date: start,
    end_date: end,
    daily: "precipitation_sum",
    timezone: "Asia/Kolkata",
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
  if (!res.ok) throw new Error(`archive ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return (Array.isArray(body) ? body : [body]).map((b) => ({ days: b.daily.time, mm: b.daily.precipitation_sum.map((v) => v ?? 0) }));
}

const ari = (mm, t) => WEIGHTS.reduce((s, w, i) => s + w * (mm[t - i] ?? 0), 0) / WSUM;
const sum = (mm, t, n) => mm.slice(Math.max(0, t - n + 1), t + 1).reduce((a, b) => a + b, 0);
const percentile = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)];

// Features the app can compute from Open-Meteo every 30 minutes (past 14 days + today).
export function features(mm, t, ari95, month) {
  return [Math.log1p(ari(mm, t) / ari95), Math.log1p(mm[t]), Math.log1p(sum(mm, t, 14)), month >= 6 && month <= 9 ? 1 : 0];
}
const NAMES = ["log(1 + ARI / ARI95)", "log(1 + rain today)", "log(1 + rain 14 days)", "monsoon month"];

const points = route.segments.map((s) => s.rainPoint);
console.log("Fetching 2001–2020 daily rain for", points.length, "stretches…");
const rain = await dailyRain(points, "2001-01-01", "2020-12-31");

const rows = [];
route.segments.forEach((seg, k) => {
  const { days, mm } = rain[k];
  const ari95 = percentile(days.map((_, t) => ari(mm, t)).filter((_, t) => t >= 6), 0.95);
  seg.ari95 = Math.round(ari95 * 100) / 100;
  const events = new Set(slides.filter((s) => s.segmentId === seg.id).map((s) => s.date));
  days.forEach((day, t) => {
    if (t < 14 || day < "2010-01-01" || day > "2017-12-31") return;
    // A slide is often dated a day late in news-based catalogues: count the day before too.
    const next = days[t + 1];
    const label = events.has(day) || (next !== undefined && events.has(next)) ? 1 : 0;
    rows.push({ year: Number(day.slice(0, 4)), x: features(mm, t, ari95, Number(day.slice(5, 7))), y: label, seg: seg.id, day });
  });
});

const train = rows.filter((r) => r.year <= 2014);
const test = rows.filter((r) => r.year >= 2015);
const dim = NAMES.length;
const mean = Array.from({ length: dim }, (_, j) => train.reduce((s, r) => s + r.x[j], 0) / train.length);
const std = Array.from({ length: dim }, (_, j) => Math.sqrt(train.reduce((s, r) => s + (r.x[j] - mean[j]) ** 2, 0) / train.length) || 1);
const z = (x) => x.map((v, j) => (v - mean[j]) / std[j]);
const sigmoid = (v) => 1 / (1 + Math.exp(-v));

// Logistic regression, class-balanced (few slide days, many quiet days), L2, gradient descent.
const pos = train.filter((r) => r.y === 1).length;
const wPos = train.length / (2 * pos);
const wNeg = train.length / (2 * (train.length - pos));
let w = new Array(dim).fill(0);
let b = 0;
const L2 = 0.01;
for (let epoch = 0; epoch < 3000; epoch++) {
  const gw = new Array(dim).fill(0);
  let gb = 0;
  for (const r of train) {
    const xz = z(r.x);
    const p = sigmoid(b + xz.reduce((s, v, j) => s + v * w[j], 0));
    const g = (p - r.y) * (r.y ? wPos : wNeg);
    xz.forEach((v, j) => (gw[j] += g * v));
    gb += g;
  }
  w = w.map((v, j) => v - 0.5 * (gw[j] / train.length + L2 * v));
  b -= 0.5 * (gb / train.length);
}

const score = (r) => b + z(r.x).reduce((s, v, j) => s + v * w[j], 0);
function auc(set) {
  const s = set.map((r) => ({ s: score(r), y: r.y })).sort((a, c) => a.s - c.s);
  let rank = 0;
  let posRanks = 0;
  s.forEach((r, i) => {
    rank = i + 1;
    if (r.y) posRanks += rank;
  });
  const P = s.filter((r) => r.y).length;
  const N = s.length - P;
  return (posRanks - (P * (P + 1)) / 2) / (P * N);
}

// Turn scores into a 0–100 index: the share of all 2010–2017 days that scored lower.
const allScores = rows.map(score).sort((a, c) => a - c);
const cut = (p) => allScores[Math.floor((allScores.length - 1) * p)];
const thresholds = { medium: cut(0.7), high: cut(0.85) };
const caught = (set, t) => set.filter((r) => r.y && score(r) >= t).length;
const testPos = test.filter((r) => r.y).length;

const model = {
  method:
    "NASA LHASA 7-day antecedent rainfall index vs local 95th percentile (2001–2020), weighed by a logistic regression trained on NASA Global Landslide Catalog events on this road (2010–2014), tested on 2015–2017.",
  features: NAMES,
  mean,
  std,
  weights: w,
  bias: b,
  // Score cut-offs: medium = top 30% of days, high = top 15% of days (2010–2017).
  thresholds,
  // Sorted sample of historical scores (every 50th) to turn a score into a percentile.
  scoreSample: allScores.filter((_, i) => i % 50 === 0),
  ari95: Object.fromEntries(route.segments.map((s) => [s.id, s.ari95])),
  evaluation: {
    trainDays: train.length,
    trainSlideDays: pos,
    testDays: test.length,
    testSlideDays: testPos,
    testAuc: Math.round(auc(test) * 100) / 100,
    trainAuc: Math.round(auc(train) * 100) / 100,
    testSlidesFlaggedHigh: `${caught(test, thresholds.high)} of ${testPos}`,
    testSlidesFlaggedMediumOrHigh: `${caught(test, thresholds.medium)} of ${testPos}`,
  },
  sources: [
    "NASA LHASA: github.com/nasa/lhasa; Kirschbaum & Stanley (2018), Earth's Future",
    "NASA Global Landslide Catalog (events within 2 km of NH-7)",
    "Rain: Open-Meteo historical weather API (ERA5), 2001–2020",
  ],
  trainedOn: new Date().toISOString().slice(0, 10),
};
writeFileSync("data/landslide-model.json", JSON.stringify(model, null, 2) + "\n");
console.log(model.evaluation, "weights", w.map((v) => v.toFixed(2)), "bias", b.toFixed(2));
