import { checkRoadPhoto } from "@/lib/photo-check";

// Only photos in our own report bucket, so this cannot be used to send any image to the AI.
const OUR_PHOTOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-photos/`;

// POST { photoUrl } → { verdict, confidence, reason } or { off: true } when no AI key is set.
export async function POST(request: Request) {
  const { photoUrl } = (await request.json().catch(() => ({}))) as { photoUrl?: string };
  if (!photoUrl || !photoUrl.startsWith(OUR_PHOTOS)) return Response.json({ error: "Not a report photo" }, { status: 400 });
  try {
    const result = await checkRoadPhoto(photoUrl);
    return Response.json(result ?? { off: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("photo check failed:", message);
    if (message === "busy") return Response.json({ error: "AI is busy, try again in a minute" }, { status: 429 });
    return Response.json({ error: "AI check failed" }, { status: 502 });
  }
}
