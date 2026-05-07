import React from "react";

export function StatCard({
  title,
  value,
  icon,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border bg-white p-5 shadow-sm ${
        onClick ? "cursor-pointer hover:bg-slate-50 transition" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}
