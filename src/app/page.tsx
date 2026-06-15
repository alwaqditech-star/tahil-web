"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { PanelCard } from "@/components/ui/panel-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type DashboardStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { HardHat, TrendingUp, Loader2, CheckSquare, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.dashboard(token);
      setStats(data);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : "حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <AppShell title="لوحة التحكم">
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
          <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
        </div>
      </AppShell>
    );
  }

  if (!stats) {
    return (
      <AppShell title="لوحة التحكم">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-rose-400">{error ?? "حدث خطأ في تحميل البيانات"}</p>
          <p className="max-w-md text-sm text-slate-500">
            قد يستغرق الخادم وقتاً عند أول طلب. جرّب إعادة المحاولة.
          </p>
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة التحكم">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="المشاريع النشطة"
          value={stats.activeProjects}
          subtitle={`${stats.delayedProjects ?? 0} متأخرة — ${stats.totalProjects} إجمالي`}
          icon={HardHat}
          accent="success"
        />
        <StatCard
          title="قيمة العقود"
          value={formatCurrency(stats.totalContractValue)}
          subtitle="إجمالي جميع المشاريع"
          icon={TrendingUp}
          accent="brand"
        />
        <StatCard
          title="الربح المتوقع"
          value={formatCurrency(stats.expectedProfit ?? 0)}
          subtitle={`هامش ${stats.overallProfitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          accent="success"
          valueTone="positive"
        />
        <StatCard
          title="مهامي المفتوحة"
          value={stats.myTasksCount ?? 0}
          subtitle={`${stats.pendingExpensesCount} مصروف + ${stats.pendingExtractsCount} مستخلص معلق`}
          icon={CheckSquare}
          accent="warning"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <PanelCard title="أبرز المشاريع" className="lg:col-span-2">
          <div className="space-y-3">
            {stats.topProjects.map((p) => (
              <div
                key={p.projectId}
                className="erp-interactive flex flex-col gap-3 rounded-xl bg-white/3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{p.projectName}</p>
                  <div className="mt-2 progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    إنجاز {p.progressPercent}% — هامش {p.profitMargin?.toFixed(1)}%
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-sm font-semibold tabular-nums text-emerald-400">{formatCurrency(p.contractValue)}</p>
                  <Link href="/projects" className="text-xs erp-link-brand">عرض</Link>
                </div>
              </div>
            ))}
            {stats.topProjects.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">لا توجد مشاريع</p>
            )}
          </div>
        </PanelCard>

        <PanelCard title="نظرة مالية">
          <div className="space-y-1">
            {[
              { label: "المصروفات المعتمدة", value: stats.totalExpenses, className: "text-money-negative" },
              { label: "المستخلصات", value: stats.totalExtracts, className: "text-money-positive" },
              { label: "المشتريات", value: stats.totalPurchases ?? 0, className: "text-money-muted" },
              { label: "إجمالي التكاليف", value: stats.totalCosts ?? stats.totalExpenses, className: "text-money-negative" },
              { label: "العهد المفتوحة", value: stats.totalPettyCashOpen, className: "text-money-default" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className={`text-sm tabular-nums ${item.className}`}>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <PanelCard title="أكثر البنود ربحاً">
          {(stats.topProfitableItems ?? []).map((i, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
              <span className="truncate text-sm text-slate-300">{i.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-money-positive">{formatCurrency(i.profit)}</span>
            </div>
          ))}
          {!(stats.topProfitableItems?.length) && <p className="text-sm text-slate-500">لا توجد بيانات</p>}
        </PanelCard>

        <PanelCard title="أكثر البنود خسارة">
          {(stats.topLossItems ?? []).map((i, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
              <span className="truncate text-sm text-slate-300">{i.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-money-negative">{formatCurrency(Math.abs(i.profit))}</span>
            </div>
          ))}
          {!(stats.topLossItems?.length) && <p className="text-sm text-slate-500">لا توجد بيانات</p>}
        </PanelCard>

        <PanelCard title="آخر العمليات">
          {(stats.recentExpenses ?? []).slice(0, 3).map((e) => (
            <div key={e.id} className="border-b border-white/5 py-2.5 last:border-0">
              <p className="truncate text-sm text-white">{e.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="text-money-negative">{formatCurrency(e.amount)}</span>
                {" — "}{e.status}
              </p>
            </div>
          ))}
          {(stats.recentExtracts ?? []).slice(0, 2).map((e) => (
            <div key={e.id} className="border-b border-white/5 py-2.5 last:border-0">
              <p className="truncate text-sm text-white">مستخلص: {e.title}</p>
              <p className="mt-0.5 text-xs text-money-positive">{formatCurrency(e.amount)}</p>
            </div>
          ))}
          {!(stats.recentExpenses?.length || stats.recentExtracts?.length) && (
            <p className="text-sm text-slate-500">لا توجد عمليات حديثة</p>
          )}
        </PanelCard>
      </div>
    </AppShell>
  );
}
