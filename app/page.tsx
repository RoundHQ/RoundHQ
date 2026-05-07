import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  MapPinned,
  ReceiptText,
  Route,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    title: "Rounds and scheduling",
    description:
      "Plan weekly rounds, assign work, track visit status, and keep repeat jobs moving without spreadsheet drift.",
    icon: CalendarDays,
  },
  {
    title: "Customer records",
    description:
      "Keep addresses, access notes, prices, contact details, and service history together for every customer.",
    icon: ClipboardCheck,
  },
  {
    title: "Quotes and invoices",
    description:
      "Create professional quotes, turn accepted work into jobs, and manage invoices from the same workspace.",
    icon: ReceiptText,
  },
  {
    title: "Route visibility",
    description:
      "See customers on the map, review round order, and spot route changes before the day starts.",
    icon: MapPinned,
  },
];

const workflow = [
  "Capture enquiries and customer details",
  "Build rounds, schedules, quotes, and invoices",
  "Track visits, payments, notes, and follow-ups",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f5ef] text-slate-950">
      <section
        className="relative flex min-h-[88svh] flex-col overflow-hidden bg-cover bg-center text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(9, 18, 16, 0.92) 0%, rgba(9, 18, 16, 0.76) 42%, rgba(9, 18, 16, 0.28) 100%), url('/Main%20Image%20-%20grass%20cutting.png')",
        }}
      >
        <header className="relative z-10 border-b border-white/15 bg-black/20">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href="/" className="text-xl font-semibold tracking-normal">
              RoundHQ
            </Link>

            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[#f3c95f] px-4 py-2 text-slate-950 transition hover:bg-[#f7d77e]"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-16 sm:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#f3c95f]">
              Built for garden maintenance and field service teams
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              RoundHQ
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86 sm:text-xl">
              Manage customers, rounds, quotes, invoices, visits, payments, and
              staff in one calm operating system for recurring outdoor work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-md bg-[#f3c95f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f7d77e]"
              >
                Start with RoundHQ
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-md border border-white/35 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-3">
          {workflow.map((step, index) => (
            <div key={step} className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#173f35] text-sm font-semibold text-white">
                {index + 1}
              </span>
              <p className="pt-1 text-base font-medium text-slate-800">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#236b5a]">
            What it handles
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            The daily admin behind repeat service work, under one roof.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Icon aria-hidden="true" className="mb-5 size-7 text-[#236b5a]" />
                <h3 className="text-lg font-semibold text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#173f35] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 text-[#f3c95f]">
              <Route aria-hidden="true" className="size-6" />
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <h2 className="text-3xl font-semibold tracking-normal">
              Ready for public SaaS foundations.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              RoundHQ is being prepared with separate customer accounts,
              subscription billing, and protected dashboards for each business.
            </p>
          </div>

          <Link
            href="/signup"
            className="inline-flex w-fit items-center rounded-md bg-[#f3c95f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f7d77e]"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
