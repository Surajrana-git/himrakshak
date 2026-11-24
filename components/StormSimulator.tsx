type Props = {
  mmPerHour: number;
  hours: number;
  onChange: (mmPerHour: number, hours: number) => void;
};

export default function StormSimulator({ mmPerHour, hours, onChange }: Props) {
  return (
    <details className="rounded-2xl border-2 border-dashed border-ink/30 p-4">
      <summary className="min-h-8 cursor-pointer font-display text-lg">Demo: baarish simulate karein</summary>
      <p className="text-sm text-muted">Simulation only. Live data mein yeh baarish nahi hai.</p>
      <label className="mt-3 flex flex-col gap-1">
        <span className="font-semibold">Toofan: {mmPerHour} mm / ghanta</span>
        <input
          type="range"
          min={0}
          max={20}
          value={mmPerHour}
          onChange={(e) => onChange(Number(e.target.value), hours)}
          className="accent-orange-dark"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1">
        <span className="font-semibold">Agle {hours} ghante tak</span>
        <input
          type="range"
          min={1}
          max={8}
          value={hours}
          onChange={(e) => onChange(mmPerHour, Number(e.target.value))}
          className="accent-orange-dark"
        />
      </label>
    </details>
  );
}
