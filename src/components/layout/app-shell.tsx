"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { Loader2, Menu } from "lucide-react";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { loading, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="min-w-0 flex-1 lg:mr-64">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-semibold text-white">{title ?? "تأهيل الاعمار"}</p>
          <NotificationBell />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {title && (
            <header className="erp-page-header hidden lg:flex">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">نظام إدارة المقاولات</p>
              </div>
              <NotificationBell />
            </header>
          )}
          {!title && (
            <div className="mb-4 hidden justify-end lg:flex">
              <NotificationBell />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
