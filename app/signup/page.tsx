"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const signupBenefits = [
  "14-day free trial",
  "No card required",
  "Everything included for one monthly price",
];

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabaseConfigured = isSupabaseConfigured();

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!supabaseConfigured) {
        setError(
          "RoundHQ is not connected to Supabase yet. Add the new Supabase URL and publishable key to .env.local."
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            company_name: companyName.trim(),
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = "/dashboard";
        return;
      }

      setSuccess("Check your email to confirm your RoundHQ account.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001d1f] px-5 py-7 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute -right-24 top-20 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
      <div className="absolute -right-8 top-36 hidden h-[300px] w-[300px] rounded-full border border-[#20d85a]/12 lg:block" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
            <Image
              src="/roundhq-logo-long-white.png"
              alt="RoundHQ"
              width={1200}
              height={300}
              priority
              className="h-auto w-[210px] sm:w-[235px]"
            />
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/12 px-4 py-2 text-sm font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
          >
            Login
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_460px]">
          <section className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              Start your free trial
            </p>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              Create your RoundHQ workspace.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/78">
              Set up your account, then manage customers, schedules, quotes,
              invoices, payments, and field work from one place.
            </p>

            <ul className="mt-9 grid gap-4 sm:grid-cols-3">
              {signupBenefits.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/[0.055] p-4 text-sm font-semibold leading-6 text-white/84"
                >
                  <BadgeCheck
                    aria-hidden="true"
                    className="mb-3 size-5 text-[#20d85a]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-white/12 bg-white p-6 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                <ShieldCheck aria-hidden="true" className="size-7" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-normal">
                  Start free
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your workspace is ready as soon as your account is confirmed.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSignup}>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Company name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Your name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="owner@company.co.uk"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {!supabaseConfigured && !error && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Supabase is not configured in this RoundHQ folder yet.
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !supabaseConfigured}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.24)] transition hover:bg-[#22d861] disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
