import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatUkDate } from "@/lib/dates";
import { hashDocumentShareToken } from "@/lib/messaging/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure document | RoundHQ",
  robots: { index: false, follow: false },
};

type LineItem = {
  description?: unknown;
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
  total?: unknown;
};

type SecureDocumentRow = {
  id: string;
  quote_number?: string | null;
  invoice_number?: string | null;
  customer_name: string;
  customer_address?: string | null;
  customer_town?: string | null;
  customer_postcode?: string | null;
  date: string;
  due_date?: string | null;
  status: string;
  items: unknown;
  notes?: string | null;
  terms?: string | null;
  total: number;
  stripe_payment_link_url?: string | null;
  stripe_payment_status?: string | null;
};
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function settingText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: unknown) {

  const amount = Number(value);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function cleanItems(value: unknown): LineItem[] {
  return Array.isArray(value) ? value.filter((item): item is LineItem => Boolean(item && typeof item === "object")) : [];
}

export default async function SecureDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) notFound();

  const supabase = createServiceRoleClient();
  const { data: share } = await supabase
    .from("document_share_tokens")
    .select("organization_id,document_type,document_id,expires_at,revoked_at")
    .eq("token_hash", hashDocumentShareToken(token))
    .gt("expires_at", new Date().toISOString())
    .is("revoked_at", null)
    .maybeSingle();
  if (!share) notFound();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name,business_timezone")
    .eq("id", share.organization_id)
    .maybeSingle();
  const { data: appState } = await supabase
    .from("app_state")
    .select("data")
    .eq("organization_id", share.organization_id)
    .eq("id", "primary")
    .maybeSingle();
  const appSettings = record(record(appState?.data)?.appSettings) ?? {};
  const bankDetails = [
    ["Account Name", settingText(appSettings.bankAccountName)],
    ["Account Number", settingText(appSettings.bankAccountNumber)],
    ["Sort Code", settingText(appSettings.bankSortCode)],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));
  const bankPaymentReference = settingText(appSettings.bankPaymentReference);

  const query =
    share.document_type === "quote"
      ? supabase
          .from("quotes")
          .select("id,quote_number,customer_name,customer_address,customer_town,customer_postcode,date,status,items,notes,total")
          .eq("organization_id", share.organization_id)
          .eq("id", share.document_id)
          .maybeSingle()
      : supabase
          .from("invoices")
          .select("id,invoice_number,customer_name,customer_address,customer_town,customer_postcode,date,due_date,status,items,notes,terms,total,stripe_payment_link_url,stripe_payment_status")
          .eq("organization_id", share.organization_id)
          .eq("id", share.document_id)
          .maybeSingle();
  const { data: rawDocument } = await query;
  const document = rawDocument as SecureDocumentRow | null;
  if (!document) notFound();

  const number = share.document_type === "quote" ? document.quote_number : document.invoice_number;
  const title = share.document_type === "quote" ? "Quote" : "Invoice";
  const items = cleanItems(document.items);
  const address = [document.customer_address, document.customer_town, document.customer_postcode]
    .filter(Boolean)
    .join(", ");
  const timeZone = organization?.business_timezone || "Europe/London";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Secure RoundHQ document</p>
            <h1 className="mt-2 text-3xl font-black">{title} {number}</h1>
            <p className="mt-2 text-slate-600">From {organization?.name || "your service provider"}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">
            <p><span className="font-semibold">Date:</span> {formatUkDate(document.date, {}, timeZone)}</p>
            {share.document_type === "invoice" && document.due_date ? (
              <p className="mt-1"><span className="font-semibold">Due:</span> {formatUkDate(document.due_date, {}, timeZone)}</p>
            ) : null}
            <p className="mt-1"><span className="font-semibold">Status:</span> {document.status}</p>
          </div>
        </header>

        <section className="py-8" aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">Prepared for</h2>
          <p className="mt-2 text-lg font-semibold">{document.customer_name}</p>
          {address ? <p className="mt-1 text-slate-600">{address}</p> : null}
        </section>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead className="bg-slate-950 text-white">
              <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const quantity = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                return (
                  <tr key={index} className="border-t border-slate-200">
                    <td className="px-4 py-3">{String(item.description || item.name || "Service")}</td>
                    <td className="px-4 py-3 text-right">{quantity}</td>
                    <td className="px-4 py-3 text-right">{money(price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(item.total ?? quantity * price)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="border-t-2 border-slate-950"><th colSpan={3} className="px-4 py-4 text-right text-base">Total</th><td className="px-4 py-4 text-right text-xl font-black">{money(document.total)}</td></tr></tfoot>
          </table>
        </div>

        {document.notes ? <section className="mt-8 rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{document.notes}</p></section> : null}
        {share.document_type === "invoice" && document.terms ? <section className="mt-4 rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">Terms</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{document.terms}</p></section> : null}

        {share.document_type === "invoice" && bankDetails.length > 0 ? (
          <section className="mt-4 rounded-2xl bg-slate-50 p-5">
            <h2 className="font-bold">Pay by bank transfer</h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              {bankDetails.map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">{label}:</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {bankPaymentReference ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">Payment reference:</dt>
                  <dd>{bankPaymentReference}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {share.document_type === "invoice" && document.status !== "Paid" && document.stripe_payment_status === "open" && document.stripe_payment_link_url ? (
          <a className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href={document.stripe_payment_link_url}>Pay this invoice securely</a>
        ) : null}
        <p className="mt-8 text-xs text-slate-500">This private link expires on {formatUkDate(share.expires_at, {}, timeZone)}. Do not forward it unless you intend to share this document.</p>
      </article>
    </main>
  );
}
