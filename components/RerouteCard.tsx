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
      <p className="font-display text-xs uppercase tracking-[0.2em]">Road closed</p>
      <p className="mt-1 font-display text-2xl leading-tight">{closedNames.join(", ")}</p>

      {failed && <p className="mt-2 text-sm">Cannot find a new route right now (routing server). Try again shortly.</p>}
      {!failed && !detour && <p className="mt-2 text-sm">Finding another route…</p>}
      {detour && !detour.found && (
        <p className="mt-2 text-sm">
          There is no other route. Wait for the road to reopen, or stop at the last safe town.
        </p>
      )}
      {detour?.found && (
        <>
          <p className="mt-2">
            Detour: <span className="font-semibold">{detour.roads.join(" → ")}</span>
          </p>
          <p className="mt-1 text-sm">
            {detour.km} km ({signed(detour.km - detour.normalKm)} km) · {detour.hours} h (
            {signed(Math.round((detour.hours - detour.normalHours) * 10) / 10)} h)
          </p>
          <button onClick={onShow} className="mt-3 min-h-12 w-full rounded-full bg-snow px-4 font-semibold text-ink">
            Show detour on map
          </button>
        </>
      )}
    </section>
  );
}

const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
