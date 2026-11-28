import { saveSosPacket } from "@/lib/sos-intake";

// Incoming-SMS webhook for the rescue gateway number (Twilio: "A message comes in" → this URL).
// The SMS body holds the packet line (HIM|…); the rest of the text is ignored.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const text = String(form?.get("Body") ?? "").slice(0, 1600);
  const result = await saveSosPacket(text, "sms");
  // Twilio expects TwiML; an empty reply sends nothing back to the caller.
  return new Response("<Response></Response>", { status: result.ok ? 200 : result.status, headers: { "Content-Type": "text/xml" } });
}
