export type Tab = "home" | "saves" | "places";

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: "home", label: "Home", path: "M3 11 12 3l9 8v10h-6v-6H9v6H3z" },
  { id: "saves", label: "Saves", path: "M6 3h12v18l-6-4-6 4z" },
  { id: "places", label: "Places", path: "M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
];

// Floating green pill with Home / Saves / Places, and the round + (× while the quick sheet is open).
export default function BottomNav({ tab, plusOpen, onTab, onPlus }: { tab: Tab; plusOpen: boolean; onTab: (t: Tab) => void; onPlus: () => void }) {
  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 px-4 pb-[max(14px,env(safe-area-inset-bottom))]" aria-label="Main">
      <div className="pointer-events-auto flex h-16 flex-1 items-center justify-around rounded-[22px] bg-green shadow-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            aria-label={t.label}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex h-12 w-14 items-center justify-center rounded-2xl text-white ${tab === t.id ? "ring-2 ring-white/80 bg-white/10" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d={t.path} />
            </svg>
          </button>
        ))}
      </div>
      <button
        onClick={onPlus}
        aria-label={plusOpen ? "Close" : "Quick actions"}
        aria-expanded={plusOpen}
        className={`pointer-events-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl ${plusOpen ? "bg-white text-ink" : "bg-green text-white"}`}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d={plusOpen ? "M6 6l12 12M18 6 6 18" : "M12 5v14M5 12h14"} />
        </svg>
      </button>
    </nav>
  );
}
