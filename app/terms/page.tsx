import type { Metadata } from "next";
import Link from "next/link";
import { TERMS_VERSION } from "@/lib/auth";

export const metadata: Metadata = { title: "Terms and Privacy · Himrakshak" };

// Plain-language draft of what the app actually does with data. Needs a lawyer's review before launch.
export default function Page() {
  return (
    <main className="h-dvh overflow-y-auto bg-white px-6 py-8 text-ink">
      <article className="mx-auto flex max-w-xl flex-col gap-4 leading-relaxed">
        <Link href="/login" className="font-semibold text-green underline">
          ← Back
        </Link>
        <p className="rounded-2xl bg-orange/15 p-3 text-sm">
          Draft version {TERMS_VERSION}. This is a hackathon prototype; this text has not been reviewed by a lawyer.
        </p>
        <h1 className="font-display text-3xl font-bold">Terms and Conditions</h1>
        <p>Himrakshak shows landslide risk, road reports and routes for Uttarakhand. It is an aid, not a guarantee: always follow police, SDRF and road authority instructions and your own judgement on the road.</p>
        <p>Do not use the phone while driving. Voice guidance is there so you can keep your eyes on the road.</p>
        <h2 className="font-display text-xl font-bold">Community reports</h2>
        <p>Only report what you see yourself. Fake or misleading reports, other people&apos;s photos, or photos showing faces or number plates on purpose may be removed and the account suspended.</p>
        <h2 id="privacy" className="font-display text-xl font-bold">Privacy Policy</h2>
        <ul className="list-disc pl-5">
          <li><b>Account:</b> name, email, optional mobile number, and the date you accepted these terms (stored in Supabase).</li>
          <li><b>Location:</b> used on your phone for the map and navigation. It is sent to our server only when you send a report or an SOS.</li>
          <li><b>Camera:</b> only when you take a report photo. The photo, its GPS point and time are public on the map.</li>
          <li><b>SOS:</b> your location and message are shown to the rescue dashboard.</li>
          <li><b>Notifications:</b> optional; you can turn them off in phone settings.</li>
        </ul>
        <p>Data is not sold. You can ask for your account and reports to be deleted by contacting the team.</p>
        <p className="text-sm text-muted">Services used: Supabase (accounts, reports), OpenStreetMap / OpenFreeMap (map), Open-Meteo (rain), Valhalla (routes).</p>
      </article>
    </main>
  );
}
