import type { SlideNewsFeed } from "@/lib/slide-news";

// Latest Uttarakhand road news (Google News, refreshed hourly) with a date badge, like the design.
export default function NewsCard({ news }: { news: SlideNewsFeed | null }) {
  const item = news?.items[0];
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">News Update</h2>
      {!item ? (
        <p className="mt-2 rounded-2xl bg-mint p-4 text-sm text-muted">
          {news ? "No news for this route in the last 6 months." : "News is unavailable right now (Google News). We will try again next hour."}
        </p>
      ) : (
        <article className="mt-2 flex gap-3 rounded-2xl bg-white p-3 shadow-md ring-1 ring-ink/5">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-green text-xs leading-tight font-semibold text-white">
            <span className="text-base">{new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
            {new Date(item.date).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{item.place ?? "North India (Uttarakhand)"}:</p>
            <p className="text-sm leading-snug text-muted">{item.title}</p>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-1 block min-h-10 py-2 text-right text-sm font-semibold text-green underline">
              See More · {item.source}
            </a>
          </div>
        </article>
      )}
    </section>
  );
}
