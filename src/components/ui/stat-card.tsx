import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const themes = {
  default: {
    card: [
      "border-slate-500/20",
      "bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-950",
      "hover:border-slate-400/35",
      "hover:shadow-[0_6px_28px_rgba(148,163,184,0.12)]",
    ],
    dot: "bg-slate-400",
    icon: "text-slate-500 group-hover:text-slate-300",
  },
  success: {
    card: [
      "border-emerald-500/25",
      "bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-slate-950",
      "hover:border-emerald-400/45",
      "hover:shadow-[0_6px_28px_rgba(52,211,153,0.18)]",
    ],
    dot: "bg-emerald-400",
    icon: "text-emerald-500/80 group-hover:text-emerald-400",
  },
  info: {
    card: [
      "border-blue-500/25",
      "bg-gradient-to-br from-blue-950/70 via-slate-900/90 to-slate-950",
      "hover:border-blue-400/45",
      "hover:shadow-[0_6px_28px_rgba(59,130,246,0.18)]",
    ],
    dot: "bg-blue-400",
    icon: "text-blue-500/80 group-hover:text-blue-400",
  },
  warning: {
    card: [
      "border-amber-500/25",
      "bg-gradient-to-br from-amber-950/70 via-slate-900/90 to-slate-950",
      "hover:border-amber-400/45",
      "hover:shadow-[0_6px_28px_rgba(245,158,11,0.18)]",
    ],
    dot: "bg-amber-400",
    icon: "text-amber-500/80 group-hover:text-amber-400",
  },
  danger: {
    card: [
      "border-rose-500/25",
      "bg-gradient-to-br from-rose-950/75 via-slate-900/90 to-slate-950",
      "hover:border-rose-400/45",
      "hover:shadow-[0_6px_28px_rgba(244,63,94,0.18)]",
    ],
    dot: "bg-rose-400",
    icon: "text-rose-500/80 group-hover:text-rose-400",
  },
  brand: {
    card: [
      "border-[#c9a066]/30",
      "bg-gradient-to-br from-[#8b6538]/25 via-slate-900/90 to-slate-950",
      "hover:border-[#c9a066]/50",
      "hover:shadow-[0_6px_28px_rgba(201,160,102,0.2)]",
    ],
    dot: "bg-[#c9a066]",
    icon: "text-[#c9a066]/70 group-hover:text-[#e8c99a]",
  },
} as const;

const valueTones = {
  default: "text-white",
  positive: "text-emerald-300",
  negative: "text-rose-300",
  muted: "text-slate-300",
} as const;

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "default",
  valueTone = "default",
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: keyof typeof themes;
  valueTone?: keyof typeof valueTones;
  className?: string;
}) {
  const theme = themes[accent];

  return (
    <div
      className={cn(
        "erp-stat-card group border p-5",
        theme.card,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", theme.dot)} aria-hidden />
          <p className="truncate text-sm text-slate-400">{title}</p>
        </div>
        <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", theme.icon)} aria-hidden />
      </div>

      <p className={cn("mt-4 text-[1.65rem] font-bold leading-tight tabular-nums sm:text-[1.85rem]", valueTones[valueTone])}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

/** صف ملخص ملوّن — للتقارير والقوائم */
export function StatRow({
  label,
  value,
  accent = "default",
  className,
}: {
  label: string;
  value: string;
  accent?: keyof typeof themes;
  className?: string;
}) {
  const theme = themes[accent];

  return (
    <div className={cn("erp-stat-card group flex items-center justify-between gap-3 border px-4 py-3", theme.card, className)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
        <span className="truncate text-sm text-slate-400">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}
