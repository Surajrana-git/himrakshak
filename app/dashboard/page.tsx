import type { Metadata } from "next";
import RescueDashboard from "@/components/RescueDashboard";

export const metadata: Metadata = { title: "Rescue room · Himrakshak" };

export default function DashboardPage() {
  return (
    <main className="h-dvh overflow-y-auto bg-ink text-snow md:overflow-hidden">
      <RescueDashboard />
    </main>
  );
}
