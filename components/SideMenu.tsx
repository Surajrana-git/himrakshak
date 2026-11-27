"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Props = { user: User | null; onLakes: () => void; onReport: () => void; onClose: () => void };

const ROW = "flex min-h-13 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-mint";

// Hamburger menu: account, the safety tools, and the legal pages.
export default function SideMenu({ user, onLakes, onReport, onClose }: Props) {
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email;
  return (
    <div className="animate-fade fixed inset-0 z-40 bg-ink/40" onClick={onClose}>
      <nav
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[82%] max-w-xs flex-col gap-1 overflow-y-auto bg-white p-4 pt-[max(20px,env(safe-area-inset-top))] shadow-2xl"
      >
        <div className="mb-3 rounded-2xl bg-mint p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Himrakshak" className="mx-auto mb-2 h-24 w-24 rounded-2xl bg-white object-contain" />
          <p className="text-center text-sm text-muted">Predict. Avoid. Survive.</p>
          <p className="mt-2 truncate text-sm font-semibold">{user ? name : "Guest (not signed in)"}</p>
        </div>
        <Link href="/sos" className={`${ROW} text-danger`}>
          SOS emergency help
        </Link>
        <button onClick={onReport} className={ROW}>
          Report a road problem
        </button>
        <button onClick={onLakes} className={ROW}>
          Glacial lakes
        </button>
        <Link href="/dashboard" className={ROW}>
          Rescue dashboard
        </Link>
        <Link href="/terms" className={ROW}>
          Terms and Privacy
        </Link>
        <div className="mt-auto pt-4">
          {user ? (
            <button onClick={() => supabase?.auth.signOut()} className={`${ROW} w-full border-2 border-green text-green`}>
              Log out
            </button>
          ) : (
            <Link href="/login" className={`${ROW} justify-center bg-green text-white hover:bg-green-dark`}>
              Sign In / Create Account
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
