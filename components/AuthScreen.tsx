"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { continueAsGuest, enabledProviders, TERMS_VERSION } from "@/lib/auth";
import { socialSignIn } from "@/lib/native";

export function HLogo({ className = "h-20 w-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="16" />
      <path d="M20 16v32h7V36h10v12h7V16h-7v13H27V16z" />
    </svg>
  );
}

const ICONS = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8c0-3.3 3.6-6 8-6s8 2.7 8 6v1H4z",
  mail: "M3 5h18v14H3zm2 2v.5l7 5 7-5V7zm0 3v7h14v-7l-7 5z",
  phone: "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z",
};

function Field({
  icon,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
}: {
  icon: keyof typeof ICONS;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="flex flex-col gap-1">
      <span className="flex min-h-13 items-center gap-3 rounded-full border border-green/40 bg-white px-5 shadow-sm focus-within:border-green">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-green" fill="currentColor" aria-hidden>
          <path d={ICONS[icon]} />
        </svg>
        <input
          type={isPassword && !shown ? "password" : isPassword ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          aria-label={label}
          autoComplete={autoComplete}
          className="min-h-12 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
        {isPassword && (
          <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Password chhupayein / Hide" : "Password dikhayein / Show"} className="flex h-10 w-10 items-center justify-center text-green">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {!shown && <path d="M4 4l16 16" />}
            </svg>
          </button>
        )}
      </span>
      {error && <span className="px-5 text-sm text-danger">{error}</span>}
    </label>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6s1.8-.8 3.3-.8 2 .8 3.3.8 2.2-1.3 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.4-4.2zM13.9 5a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1A3.7 3.7 0 0 0 13.9 5z" />
    </svg>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign in / create account (Supabase Auth). Social buttons only work once switched on in Supabase.
export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [providers, setProviders] = useState({ google: false, apple: false, phone: false });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    enabledProviders().then(setProviders).catch(() => {});
  }, []);

  // Indian mobile → +91XXXXXXXXXX; anything else is treated as an email.
  const digits = email.replace(/[\s-]/g, "");
  const phone = /^(\+91)?[6-9]\d{9}$/.test(digits) ? `+91${digits.slice(-10)}` : null;
  const isPhone = /^\+?\d[\d\s-]{7,}$/.test(email.trim());
  const phoneOtp = mode === "signin" && isPhone;
  const emailError =
    email && !EMAIL.test(email.trim())
      ? isPhone
        ? !phone
          ? "10 ankon ka Indian mobile number / 10-digit Indian number"
          : !providers.phone
            ? "Mobile OTP abhi setup nahi hua. Email use karein / Use email for now"
            : null
        : "Sahi email likhein / Enter a valid email"
      : null;
  const mobileError = mobile && !/^(\+91)?[6-9]\d{9}$/.test(mobile.replace(/[\s-]/g, "")) ? "10 ankon ka mobile number / 10-digit number" : null;
  const passwordError = mode === "create" && password && password.length < 8 ? "Kam se kam 8 akshar / At least 8 characters" : null;
  const confirmError = confirm && confirm !== password ? "Password match nahi kar raha / Passwords do not match" : null;

  const canSubmit =
    agreed &&
    !busy &&
    EMAIL.test(email.trim()) &&
    password.length > 0 &&
    (mode === "signin" || (name.trim() && !mobileError && password.length >= 8 && confirm === password));

  async function sendOtp() {
    if (!supabase || !phone) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      // New numbers get an account; the consent record goes with it.
      options: { data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() } },
    });
    setBusy(false);
    if (error) return setMessage({ text: `OTP nahi gaya: ${error.message}`, ok: false });
    setOtpSent(true);
    setMessage({ text: `${phone} par 6 ankon ka OTP bheja gaya.`, ok: true });
  }

  async function verifyOtp() {
    if (!supabase || !phone) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp.trim(), type: "sms" });
    setBusy(false);
    if (error) return setMessage({ text: `OTP galat ya purana hai: ${error.message}`, ok: false });
    router.replace("/");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phoneOtp) {
      if (!agreed || busy || !phone || !providers.phone) return;
      return otpSent ? verifyOtp() : sendOtp();
    }
    if (!supabase || !canSubmit) return;
    setBusy(true);
    setMessage(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setMessage({ text: `Login nahi hua: ${error.message}`, ok: false });
      router.replace("/");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          // Consent record: which terms version was accepted, and when.
          data: { full_name: name.trim(), mobile: mobile.trim() || null, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
        },
      });
      setBusy(false);
      if (error) return setMessage({ text: `Account nahi bana: ${error.message}`, ok: false });
      if (data.session) return router.replace("/");
      setMessage({ text: "Account ban gaya. Email mein aaya link kholkar confirm karein, phir Sign In karein.", ok: true });
      setMode("signin");
    }
  }

  async function social(provider: "google" | "apple") {
    const error = await socialSignIn(provider);
    if (error) setMessage({ text: error, ok: false });
  }

  function guest() {
    continueAsGuest();
    router.replace("/");
  }

  const create = mode === "create";
  return (
    <main className="relative min-h-dvh overflow-y-auto bg-white px-6 pt-[max(24px,env(safe-area-inset-top))] pb-10 text-ink">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-mint" aria-hidden />
      <div className="relative mx-auto flex max-w-sm flex-col gap-4">
        {create && (
          <button onClick={() => setMode("signin")} aria-label="Wapas / Back" className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
        )}
        <div className="flex flex-col items-center gap-1 text-center">
          <HLogo />
          <h1 className="mt-2 font-display text-3xl font-bold">{create ? "Create Account" : "Hi, Welcome Back!"}</h1>
          <p className="text-muted">{create ? "Join Safest Way to stay informed, prepared, and safe." : "Log in to your account · अपने खाते में जाएं"}</p>
        </div>

        {!create && (
          <div role="tablist" className="grid grid-cols-2 rounded-full border-2 border-green p-0.5">
            <button role="tab" aria-selected className="min-h-12 rounded-full bg-green font-semibold text-white">
              Sign In
            </button>
            <button role="tab" aria-selected={false} onClick={() => setMode("create")} className="min-h-12 rounded-full font-semibold text-green">
              Create Account
            </button>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          {create && <Field icon="person" label="Full Name / पूरा नाम" value={name} onChange={setName} autoComplete="name" />}
          <Field
            icon={create ? "mail" : "person"}
            label={create ? "Email Address" : "Email or Mobile Number"}
            type={create ? "email" : "text"}
            value={email}
            onChange={setEmail}
            error={emailError}
            autoComplete="email"
          />
          {create && <Field icon="phone" label="Mobile Number" type="tel" value={mobile} onChange={setMobile} error={mobileError} autoComplete="tel" />}
          {phoneOtp && otpSent && (
            <label className="flex flex-col gap-1">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 ankon ka OTP / Enter OTP"
                aria-label="OTP"
                className="min-h-13 rounded-full border border-green/40 bg-white px-5 text-center font-display text-2xl tracking-[0.4em] outline-none focus:border-green"
              />
              <button type="button" onClick={sendOtp} disabled={busy} className="self-end py-2 text-sm font-semibold text-green underline">
                OTP dobara bhejein / Resend
              </button>
            </label>
          )}
          {!phoneOtp && <Field icon="lock" label="Password" type="password" value={password} onChange={setPassword} error={passwordError} autoComplete={create ? "new-password" : "current-password"} />}
          {create && <Field icon="lock" label="Confirm Password" type="password" value={confirm} onChange={setConfirm} error={confirmError} autoComplete="new-password" />}

          {!create && !phoneOtp && (
            <button
              type="button"
              onClick={async () => {
                if (!supabase || !EMAIL.test(email.trim())) return setMessage({ text: "Pehle apna email likhein / Enter your email first", ok: false });
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
                setMessage(error ? { text: error.message, ok: false } : { text: "Password badalne ka link email par bhej diya.", ok: true });
              }}
              className="self-end font-semibold text-green underline"
            >
              Forgot Password?
            </button>
          )}

          <label className="flex min-h-12 items-start gap-3 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-green" />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-semibold text-green underline">
                Terms and Conditions
              </Link>
              {create && (
                <>
                  {" "}and{" "}
                  <Link href="/terms#privacy" className="font-semibold text-green underline">
                    Privacy Policy
                  </Link>
                </>
              )}
            </span>
          </label>

          {message && <p className={`rounded-2xl p-3 text-sm ${message.ok ? "bg-mint text-green-dark" : "bg-danger/10 text-danger"}`}>{message.text}</p>}
          {!supabase && <p className="text-sm text-danger">Login server set nahi hai (Supabase keys).</p>}

          <button
            type="submit"
            disabled={phoneOtp ? !agreed || busy || !phone || !providers.phone || (otpSent && otp.length !== 6) : !canSubmit} className="min-h-14 rounded-full bg-green font-display text-xl font-semibold text-white shadow-md disabled:opacity-40">
            {busy ? "…" : create ? "Create Account" : phoneOtp ? (otpSent ? "Verify OTP" : "OTP bhejein / Send OTP") : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-ink/15" />
          {create ? "or sign up with" : "or continue with"}
          <span className="h-px flex-1 bg-ink/15" />
        </div>
        <div className={create ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
          {(["google", "apple"] as const).map((p) => (
            <button
              key={p}
              onClick={() => social(p)}
              disabled={!providers[p]}
              title={providers[p] ? undefined : "Abhi chalu nahi hai / Not set up yet"}
              className="flex min-h-13 items-center justify-center gap-3 rounded-full border-2 border-green bg-white font-semibold text-green disabled:opacity-40"
            >
              {p === "google" ? <GoogleMark /> : <AppleMark />}
              {create ? (p === "google" ? "Google" : "Apple") : `Continue with ${p === "google" ? "Google" : "Apple"}`}
            </button>
          ))}
        </div>
        {(!providers.google || !providers.apple) && (
          <p className="text-center text-xs text-muted">{!providers.google ? "Google / Apple" : "Apple"} login abhi setup nahi hua hai.</p>
        )}

        <p className="text-center">
          {create ? "Already have an account? " : "No account yet? "}
          <button onClick={() => setMode(create ? "signin" : "create")} className="font-semibold text-green underline">
            {create ? "Sign In" : "Create one"}
          </button>
        </p>
        <button onClick={guest} className="min-h-12 text-center text-sm font-semibold text-muted underline">
          Bina login ke map dekhein / Continue without account
        </button>
      </div>
    </main>
  );
}
