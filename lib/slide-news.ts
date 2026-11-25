import { cacheLife } from "next/cache";
import route from "@/data/route-badrinath.json";

export type SlideNews = {
  link: string;
  title: string;
  source: string;
  date: string; // ISO
  place: string | null; // null: about the route but no town named, so no map pin
  lat: number | null;
  lon: number | null;
};

export type SlideNewsFeed = { items: SlideNews[]; fetchedAt: string };

function town(name: string): { lat: number; lon: number } {
  const t = route.towns.find((x) => x.name === name)!;
  return { lat: t.lat, lon: t.lon };
}

// Most specific first. Sirobagad and Lambagad are the two chronic slide zones on NH-7
// (Sirobagad from NASA's catalog, Lambagad from OpenStreetMap). Plain "Srinagar" is
// skipped on purpose: it usually means Srinagar in Kashmir.
const PLACES: { name: string; words: string[]; lat: number; lon: number }[] = [
  { name: "Sirobagad", words: ["sirobag", "sirobgarh", "सिरोबग"], lat: 30.2412, lon: 78.9006 },
  { name: "Lambagad", words: ["lambagad", "लामबगड"], lat: 30.6926, lon: 79.5132 },
  { name: "Rishikesh", words: ["rishikesh", "ऋषिकेश"], ...town("Rishikesh") },
  { name: "Devprayag", words: ["devprayag", "देवप्रयाग"], ...town("Devprayag") },
  { name: "Srinagar", words: ["srinagar garhwal", "श्रीनगर गढ़वाल"], ...town("Srinagar") },
  { name: "Rudraprayag", words: ["rudraprayag", "रुद्रप्रयाग"], ...town("Rudraprayag") },
  { name: "Gauchar", words: ["gauchar", "गौचर"], ...town("Gauchar") },
  { name: "Karnaprayag", words: ["karnaprayag", "कर्णप्रयाग"], ...town("Karnaprayag") },
  { name: "Pipalkoti", words: ["pipalkoti", "पीपलकोटी"], ...town("Pipalkoti") },
  { name: "Joshimath", words: ["joshimath", "jyotirmath", "जोशीमठ", "ज्योतिर्मठ"], ...town("Joshimath") },
  { name: "Chamoli", words: ["chamoli", "चमोली"], ...town("Chamoli") },
  { name: "Badrinath", words: ["badrinath", "बदरीनाथ", "बद्रीनाथ"], ...town("Badrinath") },
];

const SLIDE_WORDS = ["landslide", "land slide", "debris", "boulder", "भूस्खलन", "लैंडस्लाइड", "मलबा", "मलबे", "दरक", "पत्थर"];
const ROUTE_WORDS = /badrinath|बदरीनाथ|बद्रीनाथ|nh[- ]?7\b/i;
// "Badrinath highway" or "Rishikesh-Karnaprayag" names a road, not a place on it.
const ROAD_NAMES = /\S+[-–]\S+|\S+\s+(national\s+)?(highway|हाईवे|राष्ट्रीय\s+राजमार्ग|नेशनल\s+हाईवे)/gi;
// Rudraprayag district news is often about the Kedarnath trek, which is not on our road.
const OTHER_ROUTE = /kedarnath|केदारनाथ|gaurikund|गौरीकुंड|sonprayag|सोनप्रयाग|chirbasa|चीरबासा/i;
// Social posts are unverified; keep news outlets only.
const SOCIAL = /^(facebook|instagram|youtube|x|twitter|threads)$/i;
const MAX_AGE_DAYS = 180;

const QUERY =
  "(landslide OR भूस्खलन OR लैंडस्लाइड OR मलबा) (Badrinath OR Joshimath OR Chamoli OR Rudraprayag OR Karnaprayag OR Devprayag OR Pipalkoti OR Gauchar OR Sirobagad OR Lambagad OR बदरीनाथ OR बद्रीनाथ OR जोशीमठ OR चमोली OR रुद्रप्रयाग OR कर्णप्रयाग OR देवप्रयाग OR पीपलकोटी OR सिरोबगड़)";
const FEEDS = [
  `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=en-IN&gl=IN&ceid=IN:en`,
  `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=hi&gl=IN&ceid=IN:hi`,
];

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(item: string, name: string): string {
  return decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
}

function toNews(item: string): SlideNews | null {
  const source = tag(item, "source");
  // Google appends " - Source" to every headline.
  const title = tag(item, "title").replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
  const link = tag(item, "link");
  const date = new Date(tag(item, "pubDate"));
  const lower = title.toLowerCase();
  if (!link.startsWith("https://") || isNaN(date.getTime())) return null;
  if (Date.now() - date.getTime() > MAX_AGE_DAYS * 86400_000) return null;
  if (!SLIDE_WORDS.some((w) => lower.includes(w))) return null;
  if (SOCIAL.test(source)) return null;
  if (OTHER_ROUTE.test(title) && !ROUTE_WORDS.test(title)) return null;

  const placeText = lower.replace(ROAD_NAMES, " ");
  const place = PLACES.find((p) => p.words.some((w) => placeText.includes(w)));
  if (!place && !ROUTE_WORDS.test(title)) return null;
  return {
    link,
    title,
    source,
    date: date.toISOString(),
    place: place?.name ?? null,
    lat: place?.lat ?? null,
    lon: place?.lon ?? null,
  };
}

// Landslide news for our route from Google News (Hindi + English), refreshed every hour.
export async function getSlideNews(): Promise<SlideNewsFeed> {
  "use cache";
  cacheLife("hours");

  const results = await Promise.allSettled(
    FEEDS.map((url) =>
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Google News returned ${res.status}`);
        return res.text();
      }),
    ),
  );
  const xml = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (xml.length === 0) throw new Error("Google News is unreachable");

  const seen = new Set<string>();
  const items = xml
    .flatMap((feed) => feed.match(/<item>[\s\S]*?<\/item>/g) ?? [])
    .map(toNews)
    .filter((n): n is SlideNews => n !== null)
    .filter((n) => !seen.has(n.title) && seen.add(n.title))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  return { items, fetchedAt: new Date().toISOString() };
}
