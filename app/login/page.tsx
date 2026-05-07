"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
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

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dcfce7,_transparent_25%),radial-gradient(circle_at_top_right,_#dbeafe,_transparent_30%),#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* CARD */}
        <div className="overflow-hidden rounded-[34px] border border-white/60 bg-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          
          {/* HEADER */}
          <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#065f46_120%)] px-6 py-8 text-white text-center">
            
            {/* LOGO */}
            <div className="flex justify-center mb-4">
              <img
                src="/logo.png"
                alt="Cleancut Logo"
                className="h-12 object-contain"
              />
            </div>
          </div>

          {/* FORM */}
          <div className="p-6 md:p-8">


            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@cleancutltd.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
