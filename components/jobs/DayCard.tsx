import { Button } from "@/components/ui/button";

export function DayCard({
  day,
  count,
  onOpen,
}: {
  day: string;
  count: number;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{day}</p>
      <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{count}</p>
      <p className="mt-1 text-sm text-slate-500">Scheduled jobs</p>
      <Button onClick={onOpen} className="mt-4 bg-slate-900 text-white hover:bg-slate-800">
        Open round
      </Button>
    </div>
  );
}
