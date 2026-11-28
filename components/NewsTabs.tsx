"use client";

import { useState } from "react";
import { Chips } from "@/components/Screen";
import Icon from "@/components/Icon";
import type { SlideNews } from "@/lib/slide-news";
import { useContributions } from "@/lib/contributions";
import { nearestPlace } from "@/lib/trip";

const TABS = ["ALL", "Alerts", "Updates", "Events"] as const;
type Tab = (typeof TABS)[number];
type Item = { key: string; tab: Exclude<Tab, "ALL">; title: string; body: string; at: string; href: string | null; photo: string | null };

const ALERT = /landslide|closed|block|alert|warning|cloudburst|flood|debris|rockfall|avalanche/i;
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Recent News: real headlines (Google News) split into alerts and updates, plus traveller events.
export default function NewsTabs({ news }: { news: SlideNews[] }) {
  const [tab, setTab] = useState<Tab>("ALL");
  const { items: posts } = useContributions();
  const items: Item[] = [
    ...news.map((n) => ({ key: n.link, tab: ALERT.test(n.title) ? ("Alerts" as const) : ("Updates" as const), title: n.title, body: `${n.place ?? "Uttarakhand"} · ${n.source}`, at: n.date, href: n.link, photo: null })),
    ...posts
      .filter((p) => p.kind === "post" && p.visibility === "public")
      .map((p) => ({ key: p.id, tab: "Events" as const, title: p.title ?? p.category, body: `${p.details ?? p.category} · near ${nearestPlace(p).name}`, at: p.created_at, href: null, photo: p.photo_urls[0] ?? null })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((i) => tab === "ALL" || i.tab === tab);

  return (
    <>
      <Chips options={TABS} value={tab} onChange={setTab} label="News type" />
      {items.length === 0 && <p className="rounded-2xl bg-mint p-4 text-center">Nothing here yet.</p>}
      <ul className="flex flex-col gap-3">
        {items.map((i) => {
          const body = (
            <>
              {i.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.photo} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ${i.tab === "Alerts" ? "bg-danger/10 text-danger" : "bg-mint text-green"}`}>
                  <Icon name={i.tab === "Alerts" ? "hazard" : i.tab === "Events" ? "events" : "news"} className="h-8 w-8" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`text-xs font-bold ${i.tab === "Alerts" ? "text-danger" : "text-green"}`}>{i.tab === "Alerts" ? "Alert" : i.tab === "Events" ? "Event" : "Update"}</span>
                <span className="block font-display leading-snug font-semibold">{i.title}</span>
                <span className="block truncate text-sm text-muted">{i.body}</span>
                <span className="block text-xs text-muted">{when(i.at)}</span>
              </span>
            </>
          );
          const cls = "flex items-center gap-3 rounded-2xl border border-ink/10 p-2 shadow-sm";
          return (
            <li key={i.key}>
              {i.href ? (
                <a href={i.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
