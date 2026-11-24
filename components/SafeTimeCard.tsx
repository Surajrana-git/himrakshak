type Props = { safeHour: number | null; safeClock: string | null };

// The one answer a driver needs: when is it safe to leave?
export default function SafeTimeCard({ safeHour, safeClock }: Props) {
  if (safeHour === 0) {
    return (
      <Card tone="bg-teal text-ink" label="Kab niklein? / When to leave" title="Abhi nikal sakte hain">
        Poore route pe koi hissa high risk mein nahi hai. Safe to leave now.
      </Card>
    );
  }
  if (safeHour === null) {
    return (
      <Card tone="bg-danger text-snow" label="Kab niklein? / When to leave" title="Agle 12 ghante yatra na karein">
        Route agle 12 ghante high risk mein rahega. Avoid travel.
      </Card>
    );
  }
  return (
    <Card tone="bg-orange text-ink" label="Kab niklein? / When to leave" title={`${safeClock} ke baad niklein`}>
      {safeHour} ghante baad. Tab tak kam se kam ek hissa high risk mein hai. Leave after {safeClock}.
    </Card>
  );
}

function Card({ tone, label, title, children }: { tone: string; label: string; title: string; children: React.ReactNode }) {
  return (
    <section className={`${tone} rounded-2xl p-4`}>
      <p className="font-display text-xs uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-1 font-display text-3xl leading-tight">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </section>
  );
}
