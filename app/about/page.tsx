import Screen from "@/components/Screen";

export default function AboutPage() {
  return (
    <Screen title="About">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-full.png" alt="Himrakshak" className="mx-auto h-28 w-28 object-contain" />
      <div className="flex flex-col gap-4 text-center leading-relaxed">
        <p>
          In the Himalayas, a road is never just asphalt. It is a lifeline, a livelihood, and a promise to return. Yet every climb carries a quiet question: what is waiting
          around the next bend?
        </p>
        <p>
          Himrakshak was built to answer that before you even turn the key. Think of it as a co-pilot that never looks away from the mountain, reading the rain before the
          slopes give way, carrying warnings from fellow drivers miles ahead, guiding you with clear voice alerts, and staying with you through offline SMS SOS when the signal
          fades.
        </p>
        <p>Because on these peaks, nobody should have to navigate the uncertainty alone. If one car avoids one landslide, one family gets home.</p>
      </div>
      <p className="text-center text-sm text-muted">Made by Elite Zero Division · Algonex 1.0</p>
    </Screen>
  );
}
