import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  LifeBuoy,
  Mail,
  MessageSquare,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/billing/plans";
import {
  getDefaultSitePage,
  getPublishedSitePages,
  type SitePage,
  type SitePageSlug,
} from "@/lib/site-pages";

type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  label: string;
};

const bodyHeadings: Record<SitePageSlug, string> = {
  features: "The operating layer.",
  pricing: "How the plans work.",
  about: "Why RoundHQ exists.",
  resources: "What this page covers.",
  contact: "How to reach us.",
};

const featureItems: FeatureItem[] = [
  {
    title: "Leads inbox",
    description:
      "Capture new enquiries and keep them close to the customer workflow instead of losing them in messages or notebooks.",
    icon: UserPlus,
    label: "Starter",
  },
  {
    title: "Customer CRM",
    description:
      "Store customer details, service notes, addresses, prices, documents, and visit history in one record.",
    icon: Users,
    label: "Starter",
  },
  {
    title: "Recurring rounds",
    description:
      "Plan weekly, fortnightly, monthly, residential, and commercial work by week, day, and rotation.",
    icon: CalendarDays,
    label: "Starter",
  },
  {
    title: "Route map",
    description:
      "See daily work geographically so route order, travel, and job locations are easier to understand.",
    icon: Route,
    label: "Starter",
  },
  {
    title: "Quotes",
    description:
      "Create professional quotes and move accepted work into the schedule without rebuilding the job from scratch.",
    icon: FileText,
    label: "Starter",
  },
  {
    title: "Invoices",
    description:
      "Send invoices, track recurring billing, attach invoice PDFs, and keep payment status visible.",
    icon: ReceiptText,
    label: "Starter",
  },
  {
    title: "Payment tracking",
    description:
      "Record what has been paid, what is still owed, and where cash, monthly, and transfer payments stand.",
    icon: CreditCard,
    label: "Starter",
  },
  {
    title: "Visit history",
    description:
      "Log completed and missed visits so service history is not scattered across paper, memory, and messages.",
    icon: CheckCircle2,
    label: "Starter",
  },
  {
    title: "Staff permissions",
    description:
      "Give staff access to the right parts of the workspace while keeping sensitive settings controlled.",
    icon: ShieldCheck,
    label: "Growth",
  },
  {
    title: "RAMS generator",
    description:
      "Create risk assessment and method statement documents for commercial maintenance work.",
    icon: ClipboardList,
    label: "Growth",
  },
  {
    title: "Customer profitability",
    description:
      "See paid revenue, outstanding work, visit counts, and profitability signals by customer.",
    icon: Sparkles,
    label: "Growth",
  },
  {
    title: "Support helpdesk",
    description:
      "Keep customer support tickets, replies, internal notes, and file attachments attached to the workspace.",
    icon: LifeBuoy,
    label: "Platform",
  },
];

const workflowSteps = [
  {
    title: "Capture the enquiry",
    description:
      "Log the lead and keep the customer details ready for quoting and follow-up.",
  },
  {
    title: "Quote the work",
    description:
      "Build a quote, send it, and convert accepted work into scheduled jobs.",
  },
  {
    title: "Plan the round",
    description:
      "Slot recurring and one-off work into the right week, day, and route.",
  },
  {
    title: "Complete the visit",
    description:
      "Track completed or missed visits, notes, staff activity, and customer history.",
  },
  {
    title: "Invoice and collect",
    description:
      "Send invoices, record payments, and see what still needs chasing.",
  },
];

const aboutPrinciples = [
  {
    title: "Built around repeat work",
    description:
      "Rounds, rotations, visits, recurring invoices, and route visibility are first-class parts of the product.",
  },
  {
    title: "Clear enough for daily use",
    description:
      "The dashboard focuses on work due, money owed, customer context, and the operational picture owners need every day.",
  },
  {
    title: "Useful as the team grows",
    description:
      "Starter keeps solo operators organised. Growth adds permissions, RAMS, advanced insights, commercial tools, and staff capacity.",
  },
];

const contactRoutes = [
  {
    title: "Product questions",
    description:
      "Ask about features, pricing, setup, or whether RoundHQ fits your maintenance workflow.",
    action: "Email mail@roundhq.co.uk",
    href: "mailto:mail@roundhq.co.uk?subject=RoundHQ%20product%20question",
    icon: Mail,
  },
  {
    title: "Workspace support",
    description:
      "Already using RoundHQ? Open a ticket from your account so replies and files stay attached to your workspace.",
    action: "Open support",
    href: "/support",
    icon: LifeBuoy,
  },
  {
    title: "Billing help",
    description:
      "Use the billing area to manage your plan, update payment details, or check subscription status.",
    action: "Manage billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Setup guidance",
    description:
      "Tell us your team size, customer count, and current process for rounds, quotes, invoices, and payments.",
    action: "Email setup details",
    href: "mailto:mail@roundhq.co.uk?subject=RoundHQ%20setup%20help",
    icon: MessageSquare,
  },
];

function RoundHQLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
      <Image
        src="/roundhq-logo-long-white.png"
        alt="RoundHQ"
        width={1200}
        height={300}
        priority={!compact}
        className={compact ? "h-auto w-[180px]" : "h-auto w-[220px] sm:w-[240px]"}
      />
    </Link>
  );
}

function MarketingHeader({ pages }: { pages: SitePage[] }) {
  return (
    <header className="relative z-10 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-7 sm:px-8">
        <RoundHQLogo />

        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/88 lg:flex">
          {pages.map((page) => (
            <Link key={page.slug} href={`/${page.slug}`} className="hover:text-white">
              {page.navLabel}
            </Link>
          ))}
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
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
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter({ pages }: { pages: SitePage[] }) {
  return (
    <footer className="bg-[#001d1f] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <RoundHQLogo compact />
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/62">
            The all-in-one platform for garden and property maintenance
            businesses.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Pages
          </h3>
          <ul className="mt-5 space-y-3">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${page.slug}`}
                  className="text-sm text-white/60 hover:text-white"
                >
                  {page.navLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className="text-sm text-white/60 hover:text-white">
                Blog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Account
          </h3>
          <ul className="mt-5 space-y-3">
            <li>
              <Link href="/login" className="text-sm text-white/60 hover:text-white">
                Login
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-sm text-white/60 hover:text-white">
                Sign up
              </Link>
            </li>
            <li>
              <Link href="/support" className="text-sm text-white/60 hover:text-white">
                Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Contact
          </h3>
          <p className="mt-5 text-sm leading-6 text-white/62">
            Product questions and setup help:
          </p>
          <a
            href="mailto:mail@roundhq.co.uk"
            className="mt-3 inline-flex text-sm font-bold text-[#20d85a] hover:text-white"
          >
            mail@roundhq.co.uk
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; 2026 RoundHQ. All rights reserved.</span>
        <span className="inline-flex items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-[#20d85a]" />
          Built for maintenance teams.
        </span>
      </div>
    </footer>
  );
}

function PageBody({ page }: { page: SitePage }) {
  const paragraphs = page.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            {page.navLabel}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            {bodyHeadings[page.slug]}
          </h2>
        </div>

        <div className="space-y-6">
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="whitespace-pre-line text-lg leading-8 text-slate-600"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ item }: { item: FeatureItem }) {
  const Icon = item.icon;
  const isGrowth = item.label === "Growth";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#19c653]/45 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isGrowth
              ? "bg-[#003c35] text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.label}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold tracking-normal text-slate-950">
        {item.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
    </article>
  );
}

function FeaturesContent() {
  return (
    <>
      <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
              Feature set
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              The tools are connected because the work is connected.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Leads, customers, rounds, quotes, invoices, payments, staff, and
              reporting all share the same operating context, so you are not
              rebuilding the same job information in five different places.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureItems.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
              Workflow
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              From new lead to paid invoice.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              RoundHQ follows the way a maintenance job actually moves through
              the business, from first contact through to completion and payment.
            </p>
          </div>
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[58px_1fr]"
              >
                <span className="flex size-12 items-center justify-center rounded-md bg-[#003c35] text-lg font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-normal text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const isGrowth = plan.key === "growth";

  return (
    <article
      className={`relative rounded-lg border bg-white p-7 shadow-sm ${
        isGrowth ? "border-[#19c653] ring-1 ring-[#19c653]/20" : "border-slate-200"
      }`}
    >
      {plan.badge ? (
        <span className="absolute right-5 top-5 rounded-full bg-[#19c653] px-3 py-1 text-xs font-extrabold text-white">
          {plan.badge}
        </span>
      ) : null}

      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
        {plan.name}
      </p>
      <h3 className="mt-4 text-2xl font-extrabold tracking-normal text-slate-950">
        {plan.description}
      </h3>
      <div className="mt-6 flex flex-wrap items-end gap-2">
        <p className="text-5xl font-extrabold tracking-normal text-slate-950">
          GBP {plan.priceMonthly}
        </p>
        <p className="pb-2 text-sm font-bold text-[#168b43]">
          per business / month
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {plan.summaryLimits.map((limit) => (
          <div key={limit} className="rounded-md bg-slate-50 px-3 py-3">
            <p className="text-xs font-bold leading-5 text-slate-600">{limit}</p>
          </div>
        ))}
      </div>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2">
        {plan.includedFeatures.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-700">
            <BadgeCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[#18b74f]"
            />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={`/signup?plan=${plan.key}`}
        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-sm font-bold transition ${
          isGrowth
            ? "bg-[#19c653] text-white shadow-[0_14px_34px_rgba(25,198,83,0.22)] hover:bg-[#22d861]"
            : "border border-slate-200 bg-white text-slate-900 hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
        }`}
      >
        Start {plan.name}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}

function PricingContent() {
  return (
    <>
      <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
              Plans
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              Start with the essentials. Upgrade when the operation needs more.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
              Good to know
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              Pricing is tied to the business, not every single customer.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Setup", "Create your workspace and choose the plan that fits."],
              ["Starter limit", "One staff account and up to 250 customers."],
              ["Growth limit", "Up to 5 staff accounts and up to 1,500 customers."],
              ["Billing", "Stripe handles subscription checkout and billing management."],
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-extrabold tracking-normal text-slate-950">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AboutContent() {
  return (
    <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            Product philosophy
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            RoundHQ is built for the business behind the tools.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Maintenance teams already know how to do the work. RoundHQ helps
            keep the work visible, priced, scheduled, completed, invoiced, and
            paid without adding a heavy layer of generic software.
          </p>
        </div>

        <div className="grid gap-5">
          {aboutPrinciples.map((principle) => (
            <article
              key={principle.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-extrabold tracking-normal text-slate-950">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactContent() {
  return (
    <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            Contact routes
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            Send the right message to the right place.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Choose the route that matches what you need. Workspace support works
            best through the in-app helpdesk because it keeps tickets and files
            attached to your account.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {contactRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <article
                key={route.title}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="flex size-11 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-extrabold tracking-normal text-slate-950">
                  {route.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {route.description}
                </p>
                <Link
                  href={route.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#168b43] hover:text-slate-950"
                >
                  {route.action}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PageSpecificContent({ slug }: { slug: SitePageSlug }) {
  if (slug === "features") {
    return <FeaturesContent />;
  }

  if (slug === "pricing") {
    return <PricingContent />;
  }

  if (slug === "about") {
    return <AboutContent />;
  }

  if (slug === "contact") {
    return <ContactContent />;
  }

  return null;
}

export default async function SitePageView({ slug }: { slug: SitePageSlug }) {
  const pages = await getPublishedSitePages();
  const page =
    pages.find((sitePage) => sitePage.slug === slug) ?? getDefaultSitePage(slug);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_50%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <MarketingHeader pages={pages} />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pb-24 lg:pt-16">
          <section>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              {page.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-8 text-white/78">
              {page.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={page.primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
              >
                {page.primaryCtaLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {page.slug === "contact" ? (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-md border border-white/16 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Login for support
                </Link>
              ) : null}
            </div>
          </section>

          <section className="grid content-end gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {page.highlights.map((highlight) => (
              <article
                key={highlight}
                className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]"
              >
                <BadgeCheck
                  aria-hidden="true"
                  className="mb-4 size-5 text-[#18b74f]"
                />
                <p className="text-sm font-bold leading-6 text-slate-800">
                  {highlight}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <PageBody page={page} />
      <PageSpecificContent slug={page.slug} />

      <section className="bg-[#002b2d] px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              Ready when you are
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-normal">
              Bring your customers, rounds, quotes, invoices, and payments into
              RoundHQ.
            </h2>
          </div>
          <Link
            href="/signup"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
          >
            Sign up
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter pages={pages} />
    </main>
  );
}
