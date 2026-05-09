import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export function AdminLogo() {
  return (
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
  );
}

export function AdminTopHeader() {
  return (
    <header className="relative z-10 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <AdminLogo />
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[#20d85a]/30 bg-[#20d85a]/10 px-3 py-2 text-sm font-bold text-[#20d85a]">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Owner console
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
          >
            <Users aria-hidden="true" className="size-4" />
            Customers
          </Link>
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
          >
            <FileText aria-hidden="true" className="size-4" />
            Pages
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            Customer App
          </Link>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-4 py-2 font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.24)] transition hover:bg-[#22d861]"
          >
            Billing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AdminHeroShell({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#001d1f] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute -right-24 top-20 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
      <div className="absolute -right-8 top-36 hidden h-[300px] w-[300px] rounded-full border border-[#20d85a]/12 lg:block" />

      <AdminTopHeader />

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 lg:pb-16 lg:pt-14">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <section>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              {summary}
            </p>
          </section>

          {children}
        </div>
      </div>
    </section>
  );
}

export function AdminSetupNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001d1f] px-5 py-7 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <AdminLogo />
        <section className="mt-12 rounded-lg border border-white/12 bg-white p-8 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <AlertTriangle aria-hidden="true" className="size-6" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            Owner console
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950">
            {title}
          </h1>
          <div className="mt-5 text-sm leading-7 text-slate-600">{children}</div>
        </section>
      </div>
    </main>
  );
}
