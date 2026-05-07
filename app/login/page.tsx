"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabaseConfigured = isSupabaseConfigured();

  const getNextPath = () => {
    const nextPath = new URLSearchParams(window.location.search).get("next");

    if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
      return nextPath;
    }

    return "/dashboard";
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabaseConfigured) {
        setError(
          "RoundHQ is not connected to Supabase yet. Add the new Supabase URL and publishable key to .env.local."
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      window.location.href = getNextPath();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f5ef] px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="text-xl font-semibold">
            RoundHQ
          </Link>
          <Link
            href="/signup"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-950"
          >
            Sign up
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_440px]">
          <section className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#236b5a]">
              Welcome back
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
              Login to your RoundHQ dashboard.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Pick up your rounds, customers, quotes, invoices, and payments
              from the same workspace.
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.co.uk"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#236b5a] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#236b5a] focus:bg-white"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#173f35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#215648] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
