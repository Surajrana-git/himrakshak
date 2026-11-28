"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRewards } from "@/lib/rewards";
import { useSavedRoutes } from "@/lib/saved-routes";
import { getGpsFix } from "@/lib/sos";
import Icon, { type IconName } from "@/components/Icon";
import type { PlaceName } from "@/lib/geocode";

type Props = { user: User | null; savedCount: number; onSaves: () => void; onLakes: () => void; onClose: () => void };

type Row = { icon: IconName; label: string; href?: string; onClick?: () => void };

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-3">
      <h2 className="px-3 pb-1 text-sm font-semibold text-muted">{title}</h2>
      {rows.map((r) => {
        const body = (
          <>
            <Icon name={r.icon} className="h-5 w-5 text-ink" />
            <span className="flex-1 text-left">{r.label}</span>
            <Icon name="chevron" className="h-4 w-4 text-muted" />
          </>
        );
        const cls = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-medium hover:bg-mint active:bg-mint";
        return r.href ? (
          <Link key={r.label} href={r.href} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={r.label} onClick={r.onClick} className={cls}>
            {body}
          </button>
        );
      })}
    </section>
  );
}

// Hamburger menu, as in the design: profile with counts, then navigation, safety tools and settings.
export default function SideMenu({ user, savedCount, onSaves, onLakes, onClose }: Props) {
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Guest";
  const verified = Boolean(user?.email_confirmed_at || user?.phone_confirmed_at);
  const rewards = useRewards();
  const { routes } = useSavedRoutes(user?.id ?? null);
  const [where, setWhere] = useState<string | null>(null);

  useEffect(() => {
    getGpsFix()
      .then((f) => fetch(`/api/places?lat=${f.lat.toFixed(3)}&lon=${f.lon.toFixed(3)}`))
      .then((r) => (r.ok ? r.json() : { place: null }))
      .then((b: { place: PlaceName | null }) => setWhere(b.place?.title ?? null))
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade fixed inset-0 z-40 bg-ink/40" onClick={onClose}>
      <nav
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-4 pt-[max(20px,env(safe-area-inset-top))] shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl font-bold tracking-wide">HIMRAKSHAK</p>
          <Link href="/sos" className="flex flex-col items-center text-danger">
            <span className="rounded-full border-2 border-danger px-2 font-display text-sm font-bold">SOS</span>
            <span className="text-[10px] text-muted">Only in an emergency</span>
          </Link>
        </div>

        <Link href={user ? "/settings" : "/login"} className="mt-4 flex items-center gap-3 rounded-2xl p-2 hover:bg-mint">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
            <Icon name="user" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold uppercase">{name}</span>
            <span className="flex items-center gap-1 text-xs text-muted">
              {where ? `Current state: ${where}` : user ? "Finding your location…" : "Sign in to save places and routes"}
              {verified && <span className="rounded-full bg-green px-1.5 text-[10px] font-bold text-white">VERIFIED</span>}
            </span>
          </span>
          <Icon name="chevron" className="h-4 w-4 text-muted" />
        </Link>

        <div className="mt-3 grid grid-cols-3 divide-x divide-ink/10 rounded-2xl bg-snow py-2 text-center text-sm">
          <button onClick={onSaves} className="flex flex-col items-center gap-0.5">
            <Icon name="bookmark" className="h-5 w-5" />
            {savedCount} Saved
          </button>
          <Link href="/routes" className="flex flex-col items-center gap-0.5">
            <Icon name="route" className="h-5 w-5" />
            {routes.length} Routes
          </Link>
          <Link href="/earn" className="flex flex-col items-center gap-0.5">
            <Icon name="coin" className="h-5 w-5" />
            {rewards ? `${rewards.points} Earn` : "Earn"}
          </Link>
        </div>

        <Section
          title="Navigation"
          rows={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "bookmark", label: "Saved Places", onClick: onSaves },
            { icon: "map", label: "Offline Maps", href: "/offline-maps" },
            { icon: "news", label: "Recent News", href: "/news" },
          ]}
        />
        <Section
          title="Safety & Alerts"
          rows={[
            { icon: "bell", label: "Disaster Alerts", href: "/alerts" },
            { icon: "hazard", label: "Report Hazard", href: "/report-hazard" },
            { icon: "share", label: "Share Live Location", href: "/share-location" },
            { icon: "weather", label: "Weather Updates", href: "/weather" },
            { icon: "mountain", label: "Glacial Lakes", onClick: onLakes },
          ]}
        />
        <Section
          title="Settings & Support"
          rows={[
            { icon: "settings", label: "Settings", href: "/settings" },
            { icon: "language", label: "Language (English)", href: "/settings#language" },
            { icon: "help", label: "Help & Support", href: "/help" },
            { icon: "info", label: "About Himrakshak", href: "/about" },
          ]}
        />

        <div className="mt-auto pt-4">
          {user ? (
            <button onClick={() => supabase?.auth.signOut()} className="min-h-12 w-full rounded-full border-2 border-green font-semibold text-green">
              Log out
            </button>
          ) : (
            <Link href="/login" className="flex min-h-12 items-center justify-center rounded-full bg-green font-semibold text-white">
              Sign In / Create Account
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
