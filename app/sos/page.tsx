import type { Metadata } from "next";
import SosPanel from "@/components/SosPanel";

export const metadata: Metadata = { title: "SOS · Himrakshak" };

export default function SosPage() {
  return (
    <main className="h-dvh overflow-y-auto bg-snow text-ink">
      <SosPanel />
    </main>
  );
}
