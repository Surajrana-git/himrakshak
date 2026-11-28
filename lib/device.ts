"use client";

const KEY = "himrakshak-device";

// A random id for this phone, kept on the phone. It holds nothing personal: it only lets the app
// tell two drivers apart (two reports from one phone must not close a road) and count Road Rewards.
export function deviceId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
