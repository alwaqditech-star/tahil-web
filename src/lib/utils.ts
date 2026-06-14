import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(date));
}

export const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  on_hold: "متوقف",
  pending: "قيد المراجعة",
  manager_approved: "معتمد من المدير",
  approved: "معتمد",
  rejected: "مرفوض",
  draft: "مسودة",
  submitted: "مقدم",
  open: "مفتوح",
  settled: "مُسوّى",
  received: "مُستلم",
  ordered: "مطلوب",
  paid: "مدفوع",
  partial: "جزئي",
  unpaid: "غير مدفوع",
  in_progress: "جاري التنفيذ",
  cancelled: "ملغي",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  project_manager: "مدير مشاريع",
  accountant: "محاسب",
  site_supervisor: "مشرف موقع",
};
