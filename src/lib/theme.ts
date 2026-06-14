/**
 * نظام تصميم ERP — معيار عالمي
 *
 * برونز (brand)     → الشعار واسم الشركة فقط
 * أزرق (primary)    → أزرار، روابط، عنصر نشط في القائمة
 * أخضر (success)    → نشط، مدفوع، ربح
 * كهرماني (warning) → معلّق، انتظار
 * أحمر (danger)     → مرفوض، مصروف، خسارة
 * رمادي (muted)     → غير نشط، ثانوي
 */

export type BadgeVariant = "success" | "info" | "warning" | "danger" | "muted" | "default";

export const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  muted: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  default: "bg-white/8 text-slate-400 border-white/10",
};

export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: "success",
    paid: "success",
    completed: "success",
    received: "success",
    approved: "success",
    manager_approved: "success",
    settled: "success",

    in_progress: "info",

    pending: "warning",
    submitted: "warning",
    open: "warning",
    partial: "warning",
    new: "warning",
    review: "warning",
    ordered: "warning",
    draft: "muted",
    inactive: "muted",

    rejected: "danger",
    on_hold: "danger",
    unpaid: "danger",
    cancelled: "danger",
  };
  return map[status] ?? "default";
}

export type MoneyTone = "default" | "positive" | "negative" | "muted";

export const moneyClass: Record<MoneyTone, string> = {
  default: "text-money-default",
  positive: "text-money-positive",
  negative: "text-money-negative",
  muted: "text-money-muted",
};

/** @deprecated */
export const moneyToneClass = {
  income: moneyClass.default,
  expense: moneyClass.negative,
  neutral: moneyClass.muted,
  profit: moneyClass.positive,
  loss: moneyClass.negative,
};

export const spinnerClass = "spinner-brand";
export const linkClass = "erp-link";
