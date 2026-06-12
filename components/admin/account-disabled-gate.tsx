import Image from "next/image";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccountDisabledGate({
  workspaceName,
  disabledReason,
}: {
  workspaceName: string;
  disabledReason: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001d1f] px-5 py-7 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link href="/" className="block w-fit" aria-label="RoundHQ home">
          <Image
            src="/roundhq-logo-long-white.png"
            alt="RoundHQ"
            width={1200}
            height={300}
            priority
            className="h-auto w-[170px] sm:w-[220px]"
          />
        </Link>

        <section className="mt-10 rounded-lg border border-white/12 bg-white p-6 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:mt-12 sm:p-8">
          <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-rose-100 text-rose-700">
            <ShieldAlert aria-hidden="true" className="size-6" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            Account access
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950">
            {workspaceName} is currently disabled.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
            This workspace has been paused by RoundHQ support. Please contact
            RoundHQ if you think this is wrong or need help restoring access.
          </p>
          {disabledReason && (
            <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
              {disabledReason}
            </div>
          )}
          <Link
            href="/billing"
            className="mt-7 inline-flex rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
          >
            View billing
          </Link>
        </section>
      </div>
    </main>
  );
}
