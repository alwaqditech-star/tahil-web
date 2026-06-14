"use client";

import { formatCurrency } from "@/lib/utils";

export const CHART = {
  contract: "#3b82f6",
  expense: "#ef4444",
  income: "#22c55e",
  warning: "#f59e0b",
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "#64748b",
} as const;

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm shadow-xl">
      {label && <p className="mb-1.5 font-medium text-white">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="flex items-center justify-between gap-4 text-slate-300">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="tabular-nums font-medium text-white">
              {formatCurrency(entry.value ?? 0)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function formatAxisValue(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} مليار`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} مليون`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} ألف`;
  return String(value);
}
