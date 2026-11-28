import type { Metadata } from "next";
import RescueDashboard from "@/components/RescueDashboard";

export const metadata: Metadata = { title: "Rescue room · Himrakshak" };

export default function DashboardPage() {
  return (
    <main className="min-h-dvh bg-ink text-snow md:h-dvh md:overflow-hidden">
      <RescueDashboard />
    </main>
  );
}
