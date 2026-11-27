type Props = { safeHour: number | null; safeClock: string | null };

// The one answer a driver needs: when is it safe to leave?
export default function SafeTimeCard({ safeHour, safeClock }: Props) {
  if (safeHour === 0) {
    return (
      <Card tone="bg-teal text-ink" label="When to leave" title="Safe to leave now">
        No stretch of the route is at high risk.
      </Card>
    );
  }
  if (safeHour === null) {
    return (
      <Card tone="bg-danger text-snow" label="When to leave" title="Avoid travel for the next 12 hours">
        The route stays at high risk for the next 12 hours.
      </Card>
    );
  }
  return (
    <Card tone="bg-orange text-ink" label="When to leave" title={`Leave after ${safeClock}`}>
      In {safeHour} hours. Until then at least one stretch is at high risk.
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
