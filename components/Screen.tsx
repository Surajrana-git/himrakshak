"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

type ScreenProps = { icon?: IconName; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode };

// One full-page screen from the design: back arrow, big green icon, title, subtitle, content,
// and an optional sticky green action at the bottom.
export default function Screen({ icon, title, subtitle, children, footer }: ScreenProps) {
  const router = useRouter();
  return (
    <main className="mx-auto flex h-dvh max-w-lg flex-col overflow-y-auto overscroll-contain bg-white text-ink">
      <div className="flex-1 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-6">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          aria-label="Back"
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-mint"
        >
          <Icon name="back" className="h-7 w-7" />
        </button>
        <header className="mt-1 mb-5 flex flex-col items-center text-center">
          {icon && <Icon name={icon} className="mb-2 h-12 w-12 text-green" />}
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 max-w-xs text-muted">{subtitle}</p>}
        </header>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
      {footer && <div className="sticky bottom-0 bg-white/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>}
    </main>
  );
}

type RowProps = { icon: IconName; title: string; subtitle?: string; href?: string; onClick?: () => void; badge?: React.ReactNode };

// A menu row: icon tile, title, small grey line, chevron. A link when href is given.
export function MenuRow({ icon, title, subtitle, href, onClick, badge }: RowProps) {
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-green">
        <Icon name={icon} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 font-display font-semibold">
          {title}
          {badge}
        </span>
        {subtitle && <span className="block text-sm text-muted">{subtitle}</span>}
      </span>
      <Icon name="chevron" className="h-5 w-5 shrink-0 text-muted" />
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 shadow-sm active:scale-[0.99]";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

// Pill chips; one picked.
export function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${value === o ? "border-green bg-green text-white" : "border-ink/15 bg-white"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// A titled white card section, as on the form screens.
export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="font-display font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const PRIMARY = "flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-green font-display text-lg font-semibold text-white shadow-md active:scale-[0.99] disabled:opacity-50";
export const SECONDARY = "flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-green font-semibold text-green-dark";
