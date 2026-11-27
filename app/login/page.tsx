import type { Metadata } from "next";
import AuthScreen from "@/components/AuthScreen";
import Splash from "@/components/Splash";

export const metadata: Metadata = { title: "Sign in · Himrakshak" };

export default function Page() {
  return (
    <>
      <Splash />
      <AuthScreen />
    </>
  );
}
