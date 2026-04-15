"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendDayRow = {
  day: string;
  newUsers: number;
  activeUsers: number;
  documentsCreated: number;
};

export default function TrendsChartsClient({ data }: { data: TrendDayRow[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No trend data in this range.</p>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-slate-500" />
          <YAxis tick={{ fontSize: 10 }} className="text-slate-500" allowDecimals={false} />
          <Tooltip labelClassName="text-slate-900 dark:text-white" />
          <Legend />
          <Line type="monotone" dataKey="newUsers" name="New users" stroke="#2563eb" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="activeUsers" name="Active users (logins)" stroke="#0d9488" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="documentsCreated" name="Documents created" stroke="#7c3aed" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
