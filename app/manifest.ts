import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Himrakshak · Route Risk",
    short_name: "Himrakshak",
    description: "Live landslide risk for Himalayan roads. Predict. Avoid. Survive.",
    lang: "hi",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14231F",
    theme_color: "#14231F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
