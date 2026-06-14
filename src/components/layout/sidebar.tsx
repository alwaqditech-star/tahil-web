"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, HardHat, Receipt, Wallet, FileText,
  Wrench, ShoppingCart, PieChart, Users, LogOut, Truck,
  CheckSquare, FileSignature, ListChecks, X,
} from "lucide-react";
import { BrandMark } from "./brand-logo";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "project_manager", "accountant", "site_supervisor"] },
  { href: "/projects", label: "المشاريع", icon: HardHat, roles: ["admin", "project_manager", "site_supervisor"] },
  { href: "/catalog-items", label: "دليل البنود", icon: ListChecks, roles: ["admin", "project_manager", "accountant"] },
  { href: "/expenses", label: "المصروفات", icon: Receipt, roles: ["admin", "project_manager", "accountant", "site_supervisor"] },
  { href: "/petty-cash", label: "العهد", icon: Wallet, roles: ["admin", "project_manager", "accountant", "site_supervisor"] },
  { href: "/extracts", label: "المستخلصات", icon: FileText, roles: ["admin", "project_manager", "accountant"] },
  { href: "/contractors", label: "المقاولين", icon: Wrench, roles: ["admin", "project_manager"] },
  { href: "/contracts", label: "العقود", icon: FileSignature, roles: ["admin", "project_manager", "accountant"] },
  { href: "/tasks", label: "المهام", icon: CheckSquare, roles: ["admin", "project_manager", "accountant", "site_supervisor"] },
  { href: "/suppliers", label: "الموردين", icon: Truck, roles: ["admin", "project_manager", "accountant"] },
  { href: "/purchases", label: "المشتريات", icon: ShoppingCart, roles: ["admin", "project_manager", "accountant"] },
  { href: "/reports", label: "التقارير", icon: PieChart, roles: ["admin", "accountant", "project_manager"] },
  { href: "/users", label: "المستخدمين", icon: Users, roles: ["admin"] },
];

const sidebarShell =
  "fixed right-0 top-0 z-50 flex h-screen w-64 flex-col rounded-l-2xl border-l border-[#c9a066]/12 bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const filtered = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#c9a066]/10 p-5">
        <BrandMark />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filtered.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/8 text-[#e8c99a] border border-[#c9a066]/20 shadow-sm"
                  : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#c9a066]" : "text-slate-500",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        {user && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-[#c9a066]/80">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  return (
    <>
      {open && onClose && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside className={cn(sidebarShell, "hidden lg:flex")}>
        <SidebarContent />
      </aside>

      <aside
        className={cn(
          sidebarShell,
          "transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
