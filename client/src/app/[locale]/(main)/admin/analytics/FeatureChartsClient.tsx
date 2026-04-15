"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export type FeatureDayPoint = { day: string; count: number };

export default function FeatureChartsClient({
  features,
}: {
  features: { key: string; label: string; usesByDay: FeatureDayPoint[] }[];
}) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <li
          key={f.key}
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{f.label}</p>
          <div className="mt-2 h-20 w-full min-w-0">
            {f.usesByDay.length === 0 ? (
              <p className="text-xs text-slate-400">No activity in range</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={f.usesByDay} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="day" hide tick={{ fontSize: 8 }} />
                  <Tooltip labelClassName="text-slate-900 dark:text-white" />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
