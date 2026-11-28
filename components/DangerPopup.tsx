"use client";

import { useEffect } from "react";
import Icon from "@/components/Icon";
import { playSiren } from "@/lib/siren";
import { say } from "@/lib/voice";
import { getSettings } from "@/lib/settings";

export type Danger = { id: string; title: string; body: string; lat: number; lon: number };

type Props = { danger: Danger; compact: boolean; onShow: () => void; onClose: () => void };

// Full-screen red alert for a new danger near the driver: siren, strong buzz, spoken warning.
// compact (while driving): a slim banner at the top that closes itself, so the road stays in view.
export default function DangerPopup({ danger, compact, onShow, onClose }: Props) {
  useEffect(() => {
    playSiren();
    if (getSettings().vibrate) navigator.vibrate?.([500, 150, 500, 150, 500]);
    say(`Warning. ${danger.title}. ${danger.body}`);
  }, [danger]);
  useEffect(() => {
    if (!compact) return;
    const timer = setTimeout(onClose, 10_000);
    return () => clearTimeout(timer);
  }, [compact, onClose]);

  if (compact) {
    return (
      <div role="alert" className="animate-fade absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[60] md:right-auto md:left-[432px] md:w-[400px]">
        <div className="flex items-center gap-3 rounded-2xl bg-danger p-3 text-snow shadow-xl">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-snow text-danger">
            <Icon name="hazard" className="h-6 w-6" />
          </span>
          <button onClick={onShow} className="min-w-0 flex-1 text-left">
            <span className="block truncate font-display text-lg leading-tight font-bold">{danger.title}</span>
            <span className="block truncate text-sm">{danger.body}</span>
          </button>
          <button onClick={onClose} aria-label="Dismiss" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-snow/20">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-5" role="alertdialog" aria-labelledby="danger-title">
      <section className="w-full max-w-sm rounded-3xl bg-danger p-5 text-snow shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 animate-pulse items-center justify-center rounded-full bg-snow text-danger">
            <Icon name="hazard" className="h-8 w-8" />
          </span>
          <h2 id="danger-title" className="font-display text-2xl leading-tight font-bold">
            {danger.title}
          </h2>
        </div>
        <p className="mt-3 text-lg">{danger.body}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onShow} className="min-h-14 rounded-full bg-snow font-display text-lg font-semibold text-danger">
            Show on map
          </button>
          <button onClick={onClose} className="min-h-14 rounded-full border-2 border-snow font-display text-lg font-semibold">
            OK
          </button>
        </div>
      </section>
    </div>
  );
}
