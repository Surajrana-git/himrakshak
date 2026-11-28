import { createSign } from "node:crypto";
import { supabase } from "@/lib/supabase";

// Firebase Cloud Messaging (HTTP v1), signed with the project's service account.
// FIREBASE_SERVICE_ACCOUNT: the whole JSON from Firebase → Project settings → Service accounts
// → Generate new private key. Server only (Vercel secret), never in the app.
type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function account(): ServiceAccount | null {
  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? "") as ServiceAccount;
  } catch {
    return null;
  }
}

const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url");

// A one-hour Google access token from a self-signed JWT (no extra package needed).
async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signature = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${b64(signature)}` }),
  }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { access_token: string }).access_token;
}

// Sends one alert to every registered phone. Returns how many phones got it (0 when push is off).
export async function pushToAll(title: string, body: string, link = "/"): Promise<number> {
  const sa = account();
  if (!sa || !supabase) return 0;
  const [{ data: tokens }, token] = await Promise.all([supabase.rpc("alert_tokens"), accessToken(sa)]);
  if (!token || !tokens?.length) return 0;
  const results = await Promise.all(
    (tokens as string[]).map((t) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: t, notification: { title, body }, data: { link }, android: { priority: "high" } } }),
      })
        .then((r) => r.ok)
        .catch(() => false),
    ),
  );
  return results.filter(Boolean).length;
}
