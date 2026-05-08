import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CirclePlay,
  CreditCard,
  FileText,
  MapPin,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

const productPillars = [
  {
    title: "Plan & schedule",
    description: "Create weekly rounds and assign work with ease.",
    icon: CalendarDays,
  },
  {
    title: "Quote & invoice",
    description: "Send professional quotes, convert to jobs, get paid.",
    icon: FileText,
  },
  {
    title: "Route & track",
    description: "See your jobs on the map and optimise your day.",
    icon: MapPin,
  },
  {
    title: "Simple pricing",
    description: "Per business account",
    icon: CreditCard,
    price: "£30",
  },
];

const features = [
  {
    title: "Customer Management",
    description:
      "Store addresses, access notes, service history, pricing, documents and everything about your customers.",
    icon: Users,
  },
  {
    title: "Rounds & Scheduling",
    description:
      "Plan weekly rounds, assign work, track visit status, and keep repeat jobs moving without spreadsheets.",
    icon: CalendarDays,
  },
  {
    title: "Quotes & Invoices",
    description:
      "Create professional quotes, turn accepted work into jobs, and manage invoices from one workspace.",
    icon: FileText,
  },
  {
    title: "Payments & Cashflow",
    description:
      "Track what's owed, record payments, view cashflow, and keep your business financially healthy.",
    icon: CreditCard,
  },
  {
    title: "Route Visibility",
    description:
      "See all your jobs on the map, review round order, and optimise your route before the day starts.",
    icon: MapPin,
  },
  {
    title: "Team & Staff Access",
    description:
      "Add staff, set roles, and control what pages and data each person can see.",
    icon: ShieldCheck,
  },
];

const testimonials = [
  {
    quote:
      "RoundHQ has completely changed how we run our business. Everything is in one place and saves us hours each week.",
    name: "Gordon L.",
    company: "Garden Maintenance",
  },
  {
    quote:
      "The scheduling and routing features are brilliant. We get more done and our customers love the communication.",
    name: "Nicola W.",
    company: "Lawn Care Services",
  },
  {
    quote:
      "So easy to use and makes quoting and invoicing super simple. Highly recommend RoundHQ.",
    name: "Stuart M.",
    company: "Property Maintenance",
  },
];

const pricingIncludes = [
  "Unlimited customers",
  "Unlimited jobs & quotes",
  "Invoicing & payments",
  "Route planning & map view",
  "Staff accounts",
  "Email & SMS reminders",
  "Reports & insights",
];

const trustItems = ["No card required", "Cancel anytime", "£30 / month"];

function RoundHQLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white">
      <span className="flex size-10 items-center justify-center rounded-md bg-[#18c653] text-white shadow-[0_10px_30px_rgba(24,198,83,0.25)]">
        <MapPin aria-hidden="true" className="size-5 fill-white/20" />
      </span>
      <span className="leading-none">
        <span className="block text-[1.95rem] font-bold tracking-normal">
          Round<span className="text-[#20d85a]">HQ</span>
        </span>
        {!compact && (
          <span className="mt-1 block text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white/72">
            Run your rounds. Grow your business.
          </span>
        )}
      </span>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  tone = "green",
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[0.62rem] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
      <p
        className={`mt-1 text-[0.7rem] font-semibold ${
          tone === "green" ? "text-[#12823a]" : "text-red-500"
        }`}
      >
        {tone === "green" ? "On track" : "Overdue"}
      </p>
    </div>
  );
}

function LaptopMockup() {
  const jobs = [
    ["Sadie Arthur", "Residential", "Due"],
    ["Jennifer Conan", "Commercial", "Due"],
    ["Christopher Moore", "Residential", "Done"],
    ["Robert Turnbull", "Monthly", "Due"],
    ["Anne-Mare McLucas", "Cash", "Due"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="absolute -right-5 top-0 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
      <div className="absolute right-6 top-10 hidden h-[340px] w-[340px] rounded-full border border-[#20d85a]/12 lg:block" />
      <div className="relative rounded-[22px] border border-white/22 bg-[#1a2425] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
        <div className="overflow-hidden rounded-lg bg-slate-50">
          <div className="grid min-h-[370px] grid-cols-[150px_1fr]">
            <aside className="bg-[#05372e] p-4 text-white">
              <div className="mb-5 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-[#20d85a]">
                  <MapPin className="size-3.5 fill-white/25" />
                </span>
                <span className="text-sm font-bold">RoundHQ</span>
              </div>
              {[
                "Dashboard",
                "Leads",
                "Schedule",
                "Jobs",
                "Customers",
                "Quotes",
                "Invoices",
                "Reports",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`mb-1.5 rounded-md px-2 py-2 text-[0.68rem] font-semibold ${
                    index === 0
                      ? "bg-black/25 text-white"
                      : "text-white/62"
                  }`}
                >
                  {item}
                </div>
              ))}
            </aside>

            <section className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950">Dashboard</h3>
                <span className="text-xs font-bold text-slate-400">?</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <MiniStat label="Today's jobs" value="12" />
                <MiniStat label="Cut status" value="0 / 12" tone="red" />
                <MiniStat label="Total owed" value="£293.75" tone="red" />
                <MiniStat label="Day value" value="£261.25" />
              </div>

              <div className="mt-4 grid grid-cols-[1.25fr_0.85fr] gap-4">
                <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-950">
                      Today's Round
                    </h4>
                    <span className="text-[0.7rem] font-bold text-[#12823a]">
                      View schedule
                    </span>
                  </div>
                  <div className="space-y-2">
                    {jobs.map(([name, type, status]) => (
                      <div
                        key={name}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-[0.72rem] font-semibold text-slate-800">
                          {name}
                        </span>
                        <span className="rounded-sm bg-slate-100 px-1.5 py-1 text-[0.55rem] font-bold text-slate-500">
                          {type}
                        </span>
                        <span className="text-[0.6rem] font-bold text-slate-500">
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="mb-3 text-sm font-bold text-slate-950">
                      Live Map
                    </h4>
                    <div className="relative h-32 rounded-md bg-[#eef4ef]">
                      {[18, 38, 55, 72, 84].map((left, index) => (
                        <span
                          key={left}
                          className="absolute flex size-5 items-center justify-center rounded-full bg-[#0c6b45] text-[0.62rem] font-bold text-white"
                          style={{
                            left: `${left}%`,
                            top: `${22 + ((index * 17) % 52)}%`,
                          }}
                        >
                          {index + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-950">
                      Payments Snapshot
                    </h4>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      £293.75
                    </p>
                    <p className="text-[0.68rem] font-semibold text-slate-400">
                      Total owed
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-16 right-16 h-8 rounded-[50%] bg-black/40 blur-xl" />
    </div>
  );
}

function PhoneMockup() {
  const days = ["M", "T", "W", "T", "F"];

  return (
    <div className="absolute -bottom-9 right-0 hidden w-[170px] rounded-[28px] border-[6px] border-[#1a1f20] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:block">
      <div className="rounded-[21px] bg-white">
        <div className="rounded-t-[20px] bg-[#064235] p-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[0.7rem] font-bold">RoundHQ</span>
            <Menu className="size-4" />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {days.map((day, index) => (
              <span
                key={`${day}-${index}`}
                className={`flex size-6 items-center justify-center rounded-full text-[0.62rem] font-bold ${
                  index === 2 ? "bg-[#20d85a]" : "bg-white/10"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4">
          <p className="text-[0.72rem] font-bold text-slate-950">
            Today - Wednesday
          </p>
          {["Sadie Arthur", "Jennifer Conan", "Christopher Moore"].map(
            (name) => (
              <div key={name} className="mt-3 border-b border-slate-100 pb-3">
                <p className="text-[0.68rem] font-bold text-slate-900">{name}</p>
                <p className="mt-1 text-[0.56rem] text-slate-500">
                  Glasgow, G75
                </p>
              </div>
            )
          )}
          <div className="mt-4 flex items-center justify-between text-[#168b43]">
            <CalendarDays className="size-4" />
            <MapPin className="size-4" />
            <span className="flex size-8 items-center justify-center rounded-full bg-[#20d85a] text-white">
              +
            </span>
            <CreditCard className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-slate-700">
      <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-[#18b74f]" />
      {children}
    </li>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_50%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-7 sm:px-8">
            <RoundHQLogo />

            <nav className="hidden items-center gap-9 text-sm font-semibold text-white/88 lg:flex">
              <a href="#features" className="inline-flex items-center gap-1.5 hover:text-white">
                Features <ChevronDown aria-hidden="true" className="size-3.5" />
              </a>
              <a href="#pricing" className="hover:text-white">
                Pricing
              </a>
              <a href="#about" className="hover:text-white">
                About
              </a>
              <a href="#resources" className="inline-flex items-center gap-1.5 hover:text-white">
                Resources <ChevronDown aria-hidden="true" className="size-3.5" />
              </a>
              <a href="#contact" className="hover:text-white">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-white/88 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pb-24 lg:pt-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              Built for garden maintenance
              <br />
              and field service teams
            </p>
            <h1 className="mt-8 max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              The ops platform that keeps your business{" "}
              <span className="text-[#20d85a]">growing.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/82">
              RoundHQ helps maintenance businesses manage customers, rounds,
              quotes, invoices, visits, payments, and staff, all in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
              >
                Start 14-day free trial
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 rounded-md border border-[#20d85a]/70 px-6 py-4 text-sm font-bold text-white transition hover:bg-[#20d85a]/10"
              >
                <CirclePlay aria-hidden="true" className="size-5" />
                See how it works
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap gap-x-8 gap-y-4">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/88">
                  <BadgeCheck aria-hidden="true" className="size-5 text-[#20d85a]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative pb-8">
            <LaptopMockup />
            <PhoneMockup />
          </div>
        </div>

        <section className="relative z-10 border-t border-white/7 bg-white/[0.035]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
            {productPillars.map((pillar, index) => {
              const Icon = pillar.icon;

              return (
                <article
                  key={pillar.title}
                  className={`min-h-[140px] ${
                    index > 0 ? "lg:border-l lg:border-white/16 lg:pl-12" : ""
                  }`}
                >
                  <Icon aria-hidden="true" className="size-10 text-[#20d85a]" />
                  <h2 className="mt-5 text-lg font-bold text-[#20d85a]">
                    {pillar.title}
                  </h2>
                  {pillar.price ? (
                    <p className="mt-3 text-5xl font-extrabold text-white">
                      {pillar.price}
                      <span className="ml-2 text-lg font-bold text-[#20d85a]">
                        / month
                      </span>
                    </p>
                  ) : null}
                  <p className="mt-3 max-w-[230px] text-sm leading-6 text-white/78">
                    {pillar.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section id="features" className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#16a647]">
              Everything you need in one place
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              Powerful features. Built for the way maintenance businesses work.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#20d85a]/50 hover:shadow-md"
                >
                  <Icon aria-hidden="true" className="size-9 text-[#168b43]" />
                  <h3 className="mt-6 text-xl font-extrabold leading-snug text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#002b2d] px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <h2 className="max-w-lg text-4xl font-extrabold leading-tight tracking-normal">
              Trusted by maintenance businesses{" "}
              <span className="text-[#20d85a]">every day.</span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/76">
              RoundHQ brings structure, visibility and control to businesses
              that want to work smarter and grow with confidence.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-sm"
              >
                <div className="mb-5 flex gap-1 text-[#20d85a]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className="size-4 fill-current"
                    />
                  ))}
                </div>
                <p className="text-sm leading-7 text-white/86">
                  “{testimonial.quote}”
                </p>
                <p className="mt-6 text-sm font-bold text-white">
                  {testimonial.name}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {testimonial.company}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1fr_0.85fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-normal text-slate-950">
              Simple pricing.
              <br />
              Everything included.
            </h2>
            <ul className="mt-8 space-y-5">
              <CheckItem>All features included</CheckItem>
              <CheckItem>No setup fees</CheckItem>
              <CheckItem>Cancel anytime</CheckItem>
              <CheckItem>Dedicated support</CheckItem>
            </ul>
          </div>

          <article className="rounded-lg border border-slate-300 bg-white p-9 shadow-sm">
            <span className="rounded-sm bg-[#e7f9ed] px-2.5 py-1 text-xs font-extrabold uppercase text-[#168b43]">
              All-inclusive
            </span>
            <div className="mt-5 flex items-end gap-2">
              <p className="text-5xl font-extrabold tracking-normal text-slate-950">
                £30
              </p>
              <p className="pb-2 text-lg font-bold text-[#168b43]">/ month</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Per business account
            </p>

            <ul className="mt-7 space-y-3">
              {pricingIncludes.map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-5">
              <ShieldCheck aria-hidden="true" className="size-14 text-[#168b43]" />
              <div>
                <h3 className="text-xl font-extrabold text-slate-950">
                  14-day free trial
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Try RoundHQ free for 14 days. No card required.
                </p>
              </div>
            </div>
            <Link
              href="/signup"
              className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.22)] transition hover:bg-[#22d861]"
            >
              Start your free trial
            </Link>
          </article>
        </div>
      </section>

      <footer id="contact" className="bg-[#001d1f] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr_1fr]">
          <div>
            <RoundHQLogo compact />
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/62">
              The all-in-one platform for garden and property maintenance
              businesses.
            </p>
          </div>

          {[
            ["Product", "Features", "Pricing", "Integrations", "Updates"],
            ["Support", "Help Centre", "Guides", "Contact Us", "System Status"],
            ["Company", "About Us", "Blog", "Privacy Policy", "Terms of Service"],
          ].map(([heading, ...items]) => (
            <div key={heading}>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                {heading}
              </h3>
              <ul className="mt-5 space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-white/60 hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div id="resources">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
              Stay connected
            </h3>
            <p className="mt-5 text-sm leading-6 text-white/62">
              Get tips, product updates, and news straight to your inbox.
            </p>
            <form className="mt-5 flex overflow-hidden rounded-md border border-white/10 bg-white/8">
              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/42"
              />
              <button
                type="submit"
                className="flex w-12 items-center justify-center bg-[#19c653] text-white transition hover:bg-[#22d861]"
                aria-label="Join mailing list"
              >
                <ArrowRight aria-hidden="true" className="size-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 RoundHQ. All rights reserved.</span>
          <span className="inline-flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-[#20d85a]" />
            Built for maintenance teams.
          </span>
        </div>
      </footer>
    </main>
  );
}
