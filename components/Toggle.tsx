"use client";

// A settings switch row: label, short line, on/off written in words too.
export default function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-ink/10 p-3 text-left shadow-sm">
      <span className="flex-1">
        <b>{label}</b>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
      <span className="text-sm font-semibold">{on ? "On" : "Off"}</span>
      <span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${on ? "bg-green" : "bg-ink/20"}`}>
        <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : ""}`} />
      </span>
    </button>
  );
}
