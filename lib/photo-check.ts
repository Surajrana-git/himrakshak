export type PhotoVerdict = { verdict: "blocked" | "clear" | "unclear"; confidence: number; reason: string };

// Google Gemini, free tier (key from aistudio.google.com, no card needed).
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["blocked", "clear", "unclear"] },
    confidence: { type: "NUMBER" },
    reason: { type: "STRING" },
  },
  required: ["verdict", "confidence", "reason"],
};

const PROMPT = `This photo was sent by a driver in Uttarakhand as a road report (landslide, rockfall, blocked road, water on the road).
Decide whether the road in the photo is blocked for a car right now.
- "blocked": debris, rocks, mud, a fallen slope, water or a vehicle pile-up stop a car from passing.
- "clear": a road is visible and a car can pass.
- "unclear": no road visible, too dark or blurry, or not a road photo.
confidence is 0 to 1. reason is one short plain-English sentence a driver understands, under 15 words.`;

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

// The AI looks at a report photo and says whether the road is blocked. null when no
// GEMINI_API_KEY is set (the check is then off and the app says so).
export async function checkRoadPhoto(photoUrl: string): Promise<PhotoVerdict | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const photo = await fetch(photoUrl);
  if (!photo.ok) throw new Error(`Photo download failed: ${photo.status}`);
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("Photo is too large");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: photo.headers.get("content-type") ?? "image/jpeg", data: bytes.toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
    }),
  });
  if (res.status === 429) throw new Error("busy");
  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
  const body: GeminiResponse = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { verdict: "unclear", confidence: 0, reason: "The AI could not check this photo." };
  const parsed: PhotoVerdict = JSON.parse(text);
  return { ...parsed, confidence: Math.min(1, Math.max(0, parsed.confidence)) };
}
