import type { Metadata, Viewport } from "next";
import { Oswald, Public_Sans } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Himrakshak · Route Risk",
  description: "Live landslide risk for Himalayan roads. Predict. Avoid. Survive.",
  appleWebApp: { capable: true, title: "Himrakshak", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#14231F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${oswald.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
