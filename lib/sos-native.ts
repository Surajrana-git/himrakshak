"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type MeshStatus = { running: boolean; heard: number; relayed: number; synced: number; sending: boolean };
export type MeshEvent = MeshStatus & { event: string; packet?: string };
export type SmsEvent = { number: string; status: "sent" | "delivered" | "retrying" | "failed"; detail: string };

type SosNative = {
  sendSms(o: { number: string; text: string }): Promise<SmsEvent>;
  startMesh(o: { packet?: string }): Promise<MeshStatus>;
  stopMesh(): Promise<MeshStatus>;
  meshStatus(): Promise<MeshStatus>;
  addListener(event: "mesh", fn: (e: MeshEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: "sms", fn: (e: SmsEvent) => void): Promise<PluginListenerHandle>;
};

// Android app only (android/app/src/main/java/in/himrakshak/app/SosNativePlugin.java).
export const sosNative = registerPlugin<SosNative>("SosNative");
export const hasNativeSos = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("SosNative");
