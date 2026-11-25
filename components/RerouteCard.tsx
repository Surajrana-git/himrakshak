import type { Detour } from "@/lib/detour";

type Props = {
  closedNames: string[];
  detour: Detour | null; // null while loading
  failed: boolean;
  onShow: () => void;
};

// Waze-style: the road ahead is closed, here is the way around and what it costs.
export default function RerouteCard({ closedNames, detour, failed, onShow }: Props) {
  return (
    <section className="rounded-2xl bg-danger p-4 text-snow">
      <p className="font-display text-xs uppercase tracking-[0.2em]">Rasta band / Road closed</p>
      <p className="mt-1 font-display text-2xl leading-tight">{closedNames.join(", ")}</p>

      {failed && <p className="mt-2 text-sm">Naya rasta abhi nahi mil raha (routing server). Thodi der baad try karein.</p>}
      {!failed && !detour && <p className="mt-2 text-sm">Doosra rasta dhoondh rahe hain…</p>}
      {detour && !detour.found && (
        <p className="mt-2 text-sm">
          Koi doosra rasta nahi hai. Rasta khulne ka intezaar karein, ya pichhle surakshit town mein rukein.
        </p>
      )}
      {detour?.found && (
        <>
          <p className="mt-2">
            Naya rasta / Detour: <span className="font-semibold">{detour.roads.join(" → ")}</span>
          </p>
          <p className="mt-1 text-sm">
            {detour.km} km ({signed(detour.km - detour.normalKm)} km) · {detour.hours} ghante (
            {signed(Math.round((detour.hours - detour.normalHours) * 10) / 10)} ghante)
          </p>
          <button onClick={onShow} className="mt-3 min-h-12 w-full rounded-full bg-snow px-4 font-semibold text-ink">
            Naya rasta map pe dekhein
          </button>
        </>
      )}
    </section>
  );
}

const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
