"use client";

import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { isApp } from "@/lib/native";
import { PLACES, type Place } from "@/lib/trip";
import { getSettings } from "@/lib/settings";

export type VoiceCommand =
  | { type: "go"; place: Place }
  | { type: "find"; query: string } // "go to <a place we only know from search>"
  | { type: "start" }
  | { type: "save" }
  | { type: "sos" }
  | { type: "report" }
  | { type: "stop" }
  | { type: "unknown"; heard: string };

// Chrome's built-in recogniser (no key). Android's WebView has none, so the app uses the native plugin.
type WebRecognition = { lang: string; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: () => void; onend: () => void; start: () => void };
function webRecognition(): (new () => WebRecognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return isApp() || webRecognition() !== null;
}

// One utterance as text, or "" if nothing was heard.
export async function listen(): Promise<string> {
  if (isApp()) {
    const { available } = await SpeechRecognition.available();
    if (!available) throw new Error("Voice is not available on this phone");
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") throw new Error("Allow the microphone to use voice commands");
    const { matches } = await SpeechRecognition.start({ language: "en-IN", maxResults: 1, popup: true, partialResults: false, prompt: "Say a command" });
    return matches?.[0] ?? "";
  }
  const Recognition = webRecognition();
  if (!Recognition) throw new Error("Voice is not supported in this browser");
  return new Promise((resolve) => {
    const rec = new Recognition();
    let heard = "";
    rec.lang = "en-IN";
    rec.onresult = (e) => (heard = e.results[0][0].transcript);
    rec.onerror = () => resolve("");
    rec.onend = () => resolve(heard);
    rec.start();
  });
}

const has = (text: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(text));

// Short, forgiving matching: "go to Kedarnath", "navigate to Badrinath", "Kedarnath chalo", "start", "save route"…
export function parseCommand(heard: string): VoiceCommand {
  const text = heard.toLowerCase().trim();
  if (has(text, ["sos", "help", "emergency", "madad", "bachao"])) return { type: "sos" };
  if (has(text, ["stop", "end", "cancel", "band karo"])) return { type: "stop" };
  if (has(text, ["save", "bookmark"])) return { type: "save" };
  if (has(text, ["report", "landslide here", "road blocked"])) return { type: "report" };
  // "Gaurikund (Kedarnath)" answers to both names; dhams first, so "Kedarnath" means the shrine's road head.
  const names = (p: Place) => p.name.toLowerCase().split(/\s*[()]\s*/).filter(Boolean);
  const place = [...PLACES]
    .sort((a, b) => Number(b.dham) - Number(a.dham))
    .find((p) => names(p).some((n) => text.includes(n)) || heard.includes(p.hindi));
  if (place) return { type: "go", place };
  const to = text.match(/\b(?:go|navigate|take me|directions|route|drive)\s+to\s+(.+)$/);
  if (to) return { type: "find", query: to[1].replace(/[.?!]+$/, "").trim() };
  if (has(text, ["start", "go", "chalo", "navigate"])) return { type: "start" };
  return { type: "unknown", heard };
}

export function say(text: string) {
  if (!("speechSynthesis" in window) || !getSettings().voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
