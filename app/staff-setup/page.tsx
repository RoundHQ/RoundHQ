"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type StaffSetupResponse = {
  ok?: boolean;
  email?: string;
  message?: string;
  error?: string;
};

export default function StaffSetupPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const setupToken = new URLSearchParams(window.location.search).get("token");

    if (!setupToken) {
      setError("This staff setup link is missing its token.");
      return;
    }

    setToken(setupToken);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token) {
      setError("This staff setup link is missing its token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/staff/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as StaffSetupResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to set up your staff account.");
      }

      setNotice(data.message ?? "Your RoundHQ staff account is ready.");

      if (data.email && isSupabaseConfigured()) {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password,
        });

        if (!signInError) {
          window.location.href = "/dashboard";
          return;
        }
      }

      setPassword("");
      setConfirmPassword("");
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to set up your staff account."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001d1f] px-5 py-7 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
            <Image
              src="/roundhq-logo-long-white.png"
              alt="RoundHQ"
              width={1200}
              height={300}
              priority
              className="h-auto w-[170px] sm:w-[235px]"
            />
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/12 px-4 py-2 text-sm font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
          >
            Login
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 sm:py-12 lg:grid-cols-[1fr_440px]">
          <section className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              Staff account setup
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              Create your RoundHQ password.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/78">
              Set your password to open your assigned jobs, route, schedule, and
              technician profile in RoundHQ.
            </p>
          </section>

          <section className="rounded-lg border border-white/12 bg-white p-6 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                <KeyRound aria-hidden="true" className="size-7" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-normal">
                  Set password
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use at least 8 characters. Once saved, we&apos;ll sign you in if
                  possible.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                  minLength={8}
                />
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSaving || !token}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.24)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving password..." : "Create staff account"}
                {!isSaving ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
