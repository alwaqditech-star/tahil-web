import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const COMPANY_NAME_AR = "تأهيل الاعمار";
export const COMPANY_NAME_EN = "TAHIL ALEMAAR";
export const LOGO_PATH = "/logo-tahil-alemaar.png";

/** أيقونة المبنى — نفس روح الشعار، بدون خلفية بيضاء */
export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="tahil-bronze" x1="24" y1="4" x2="24" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8c99a" />
          <stop offset="0.45" stopColor="#c9a066" />
          <stop offset="1" stopColor="#8b6538" />
        </linearGradient>
      </defs>
      <path d="M24 6L8 16v32h8V22l8-5 8 5v26h8V16L24 6Z" stroke="url(#tahil-bronze)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 22h16M18 28h12M18 34h12M18 40h12" stroke="url(#tahil-bronze)" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M24 6v10M8 16l16-10 16 10" stroke="url(#tahil-bronze)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** رأس الهوية — للدخول والصفحات العامة */
export function BrandHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-white/10 bg-slate-800/80">
        <BrandIcon className="h-11 w-11" />
      </div>
      <h1 className="text-2xl font-bold text-white">{COMPANY_NAME_AR}</h1>
      <p className="mt-2 font-[family-name:var(--font-outfit)] text-[11px] uppercase tracking-[0.28em] text-slate-500">
        {COMPANY_NAME_EN}
      </p>
      <p className="mt-3 text-sm text-slate-500">نظام إدارة المقاولات</p>
    </div>
  );
}

/** للشريط الجانبي — أنيق على الخلفية الداكنة */
export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3 transition-opacity hover:opacity-95", className)}>
      <div className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-[#c9a066]/25 bg-gradient-to-b from-[#c9a066]/15 to-[#8b6538]/10",
        compact ? "h-11 w-11" : "h-14 w-14",
      )}>
        <BrandIcon className={compact ? "h-7 w-7" : "h-9 w-9"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-bold text-white leading-tight truncate", compact ? "text-sm" : "text-base")}>
          {COMPANY_NAME_AR}
        </p>
        <p className={cn(
          "font-[family-name:var(--font-outfit)] tracking-[0.22em] text-[#c9a066] uppercase truncate",
          compact ? "text-[9px] mt-0.5" : "text-[10px] mt-1",
        )}>
          {COMPANY_NAME_EN}
        </p>
        {!compact && (
          <p className="text-[10px] text-slate-500 mt-1">نظام إدارة المقاولات</p>
        )}
      </div>
    </Link>
  );
}

/** الشعار الكامل — للخلفيات الفاتحة فقط */
export function BrandLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <Image
        src={LOGO_PATH}
        alt={`${COMPANY_NAME_AR} — ${COMPANY_NAME_EN}`}
        width={320}
        height={168}
        className="h-auto w-full max-w-[280px] object-contain"
        priority
      />
    </div>
  );
}

/** @deprecated استخدم BrandMark أو BrandLogoFull */
export function BrandLogo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  if (size === "lg") return <BrandLogoFull className={className} />;
  return <BrandMark compact={size === "sm"} className={className} />;
}
