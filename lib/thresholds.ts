// Rainfall thresholds for landslides published by Indian studies of this very road. Rain of
// intensity I (mm/h) lasting D hours above the curve I = a·D^b has triggered slides there before.
export const THRESHOLDS = [
  { id: "nh58", name: "Rishikesh–Mana road (NH-58/NH-7) study", a: 58.7, b: -1.12, source: "NHESS 24, 465 (2024), TRMM rain, 81.6% of 2005–06 slides" },
  { id: "chamoli", name: "Chamoli–Joshimath study", a: 1.82, b: -0.23, source: "Landslides (2013), doi 10.1007/s10346-013-0438-9" },
] as const;

const DURATIONS = [1, 3, 6, 12, 24, 48, 72];

// For each threshold: how close the rain up to 6 h from now comes to it (1 or more = at or above),
// checking every duration from 1 h to 3 days that ends 6 h ahead.
export function thresholdRatios(hourlyMm: number[], nowIndex: number): Record<(typeof THRESHOLDS)[number]["id"], number> {
  const end = Math.min(hourlyMm.length, nowIndex + 6);
  const ratio = (a: number, b: number) =>
    Math.max(
      ...DURATIONS.filter((d) => d <= end).map((d) => {
        const rain = hourlyMm.slice(end - d, end).reduce((s, v) => s + v, 0);
        return rain / d / (a * d ** b);
      }),
    );
  return { nh58: ratio(58.7, -1.12), chamoli: ratio(1.82, -0.23) };
}
