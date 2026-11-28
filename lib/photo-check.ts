import Anthropic from "@anthropic-ai/sdk";

export type PhotoVerdict = { verdict: "blocked" | "clear" | "unclear"; confidence: number; reason: string };

const SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["blocked", "clear", "unclear"] },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["verdict", "confidence", "reason"],
  additionalProperties: false,
};

const PROMPT = `This photo was sent by a driver in Uttarakhand as a road report (landslide, rockfall, blocked road, water on the road).
Decide whether the road in the photo is blocked for a car right now.
- "blocked": debris, rocks, mud, a fallen slope, water or a vehicle pile-up stop a car from passing.
- "clear": a road is visible and a car can pass.
- "unclear": no road visible, too dark or blurry, or not a road photo.
confidence is 0 to 1. reason is one short plain-English sentence a driver understands, under 15 words.`;

// Claude looks at a report photo and says whether the road is blocked. null when no
// ANTHROPIC_API_KEY is set (the check is then off and the app says so).
export async function checkRoadPhoto(photoUrl: string): Promise<PhotoVerdict | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: photoUrl } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return { verdict: "unclear", confidence: 0, reason: "The AI could not check this photo." };
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed: PhotoVerdict = JSON.parse(text.text);
  return { ...parsed, confidence: Math.min(1, Math.max(0, parsed.confidence)) };
}
