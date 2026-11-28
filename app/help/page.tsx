import Screen, { MenuRow } from "@/components/Screen";

const REPO = "https://github.com/Surajrana-git/himrakshak";

const FAQS = [
  ["How is the road risk worked out?", "For every 10 km of road: live rain now and in the next 6 hours (Open-Meteo) × how steep the hills are × past landslides nearby (NASA). Low, Medium or High is written on the map."],
  ["When does a road show as closed?", "When drivers on two different phones report a block within 1 km in 12 hours, and nobody has reported it clear since."],
  ["What if there is no internet?", "SOS sends your GPS location by SMS. The last risk map and any offline maps you downloaded still open."],
  ["Why only Geo Cam photos?", "Place, GPS and time are printed on the photo, and an AI check rejects screenshots and gallery photos, so reports cannot be faked."],
  ["How do I earn points?", "10 points for every report or post, 20 more when another driver confirms your report. 1 point = ₹1 in Road Rewards."],
];

export default function HelpPage() {
  return (
    <Screen icon="help" title="Help & Support" subtitle="Get assistance and resolve your queries.">
      <section className="rounded-3xl border border-ink/10 p-4 shadow-sm">
        <h2 className="font-display font-semibold">FAQs</h2>
        {FAQS.map(([q, a]) => (
          <details key={q} className="border-b border-ink/10 py-3 last:border-0">
            <summary className="min-h-8 cursor-pointer font-semibold">{q}</summary>
            <p className="mt-1 text-sm text-muted">{a}</p>
          </details>
        ))}
      </section>
      <MenuRow icon="phone" title="Contact Support" subtitle="Get help from our team" href={`${REPO}/issues`} />
      <MenuRow icon="edit" title="Send Feedback" subtitle="Share your suggestion" href={`${REPO}/issues/new`} />
      <p className="text-center text-sm text-muted">In danger? Use SOS on the map, or call 112.</p>
    </Screen>
  );
}
