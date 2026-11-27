import type { CapacitorConfig } from "@capacitor/cli";

// The app loads the deployed site, because routes, news and reroute run on the server.
// Set CAP_SERVER_URL before `npx cap sync` (Vercel URL, or http://10.0.2.2:3000 for the emulator).
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "in.himrakshak.app",
  appName: "Himrakshak",
  webDir: "mobile-shell",
  server: serverUrl ? { url: serverUrl, cleartext: serverUrl.startsWith("http://") } : undefined,
  android: { backgroundColor: "#14231F" },
};

export default config;
