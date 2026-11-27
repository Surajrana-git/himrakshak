import type { SlideNewsFeed } from "@/lib/slide-news";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// Real headlines from Google News, so judges and drivers can open the source.
export default function RecentNews({ news }: { news: SlideNewsFeed | null }) {
  return (
    <section>
      <h2 className="font-display text-xl">Recent landslide news</h2>
      {!news ? (
        <p className="mt-2 text-sm text-muted">News is unavailable right now (Google News). We will try again next hour.</p>
      ) : news.items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No landslide news on this route in the last 6 months.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/15">
          {news.items.slice(0, 10).map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="block min-h-12 py-3">
                <p className="font-semibold leading-snug">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {n.place ?? "Badrinath highway"} · {n.source} · {daysAgo(n.date)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
      {news && <p className="mt-1 text-xs text-muted">Updated hourly · last checked {clock(news.fetchedAt)} IST</p>}
    </section>
  );
}
