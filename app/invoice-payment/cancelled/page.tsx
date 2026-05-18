import Link from "next/link";
import Image from "next/image";

export default function InvoicePaymentCancelledPage() {
  return (
    <main className="min-h-screen bg-[#052f2d] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-between">
        <header>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/roundhq-logo-long-white.png"
              alt="RoundHQ"
              width={190}
              height={48}
              className="h-9 w-auto"
            />
          </Link>
        </header>

        <section className="py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Payment cancelled
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            No payment was taken.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
            You can safely close this page and use the invoice link again when
            you are ready to pay.
          </p>
        </section>

        <footer className="border-t border-white/10 pt-6 text-sm text-white/55">
          Secure payments powered by Stripe.
        </footer>
      </div>
    </main>
  );
}
