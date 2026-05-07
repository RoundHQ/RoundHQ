"use client";

import type { Customer, VisitLog } from "@/components/jobs/types";

type Props = {
  visits: VisitLog[];
  customers: Customer[];
  onTogglePaid: (visitId: number | string) => void;
};

export default function ActionsPage({
  visits,
  customers,
  onTogglePaid,
}: Props) {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const actionVisits = visits.filter((visit) => {
    const customer = customerMap.get(visit.customerId);
    if (customer?.paymentMethod !== "Cash") {
      return false;
    }

    const isPaid =
      (visit as any).paid === true || visit.paymentStatus === "Paid";

    return !isPaid;
  });

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-xl font-bold">Actions</h2>

      {actionVisits.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing to show.</p>
      ) : (
        actionVisits.map((visit) => {
          const customer = customerMap.get(visit.customerId);
          const isPaid =
            (visit as any).paid === true || visit.paymentStatus === "Paid";

          return (
            <div key={visit.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">
                    {customer?.name ?? "Unknown Customer"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(visit.visitDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  {visit.status === "not_cut" && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                      Not Cut
                    </span>
                  )}

                  {!isPaid && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                      Unpaid
                    </span>
                  )}

                  <button
                    onClick={() => onTogglePaid(visit.id)}
                    className="rounded-full border px-3 py-1"
                  >
                    {isPaid ? "Paid" : "Mark Paid"}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
