import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import NativeBridge from "@/components/NativeBridge";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Himrakshak · Safest Way",
  description: "Live landslide risk for Himalayan roads. Predict. Avoid. Survive.",
  appleWebApp: { capable: true, title: "Himrakshak", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0E7A3D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${poppins.variable} ${inter.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans">
        {children}
        <ServiceWorker />
        <NativeBridge />
      </body>
    </html>
  );
}
