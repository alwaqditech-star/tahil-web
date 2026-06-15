"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { PanelCard } from "@/components/ui/panel-card";
import { CHART, ChartTooltip, formatAxisValue } from "@/components/ui/charts";
import { useAuth } from "@/contexts/auth-context";
import { api, type FinancialReport } from "@/lib/api";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Loader2, RefreshCw, Filter,
  Wallet, Download, Hash,
} from "lucide-react";

type TabId = "overview" | "projects" | "contractors" | "suppliers" | "expenses" | "extracts" | "petty";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "projects", label: "تقرير مشروع" },
  { id: "contractors", label: "تقرير مقاول" },
  { id: "suppliers", label: "تقرير مورد" },
  { id: "expenses", label: "المصروفات" },
  { id: "extracts", label: "المستخلصات" },
  { id: "petty", label: "العهد حسب الموظف" },
];

function exportPettyCashCsv(rows: FinancialReport["pettyCashByEmployee"]) {
  const headers = ["الموظف", "عدد العهد", "المخصص", "المستخدم", "المتبقي"];
  const lines = rows.map((p) => [
    p.name,
    String(p.count),
    String(p.allocated),
    String(p.used),
    String(p.remaining),
  ]);
  const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "العهد-حسب-الموظف.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            {headers.map((h) => (
              <th key={h} className="px-3 py-3 text-right font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="erp-interactive border-b border-white/5 last:border-0">
              {cells.map((cell, j) => (
                <td key={j} className="px-3 py-3 text-slate-200">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [projectId, setProjectId] = useState<number | "all">("all");
  const [data, setData] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const report = await api.reports.financial(token, projectId);
      setData(report);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => { load(); }, [load]);

  const filterLabel = projectId === "all"
    ? "جميع المشاريع"
    : data?.projectsList.find((p) => p.id === projectId)?.name ?? "مشروع محدد";

  return (
    <AppShell title="التقارير المالية">
      <div className="mb-6">
        <p className="text-sm text-slate-400">
          استخرج تقارير تفصيلية لكل قسم مع فلاتر متقدمة
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-[var(--brand)] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-6 glass-card p-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <Filter className="h-4 w-4" />
          فلترة حسب المشروع
        </label>
        <select
          value={projectId === "all" ? "all" : String(projectId)}
          onChange={(e) => setProjectId(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]"
        >
          <option value="all">جميع المشاريع</option>
          {(data?.projectsList ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {projectId !== "all" && (
          <p className="mt-2 text-xs text-slate-500">عرض بيانات: {filterLabel}</p>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
          <p className="text-sm text-slate-500">جاري تحميل التقرير...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-rose-400">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tab === "petty" ? (
              <>
                <StatCard
                  title="إجمالي المتبقي"
                  value={formatCurrency(data.pettyCashSummary.totalRemaining)}
                  subtitle={filterLabel}
                  icon={TrendingUp}
                  accent="success"
                  valueTone="positive"
                />
                <StatCard
                  title="إجمالي المستخدم"
                  value={formatCurrency(data.pettyCashSummary.totalUsed)}
                  subtitle="من العهد المخصصة"
                  icon={TrendingDown}
                  accent="danger"
                  valueTone="negative"
                />
                <StatCard
                  title="إجمالي المخصص"
                  value={formatCurrency(data.pettyCashSummary.totalAllocated)}
                  subtitle={`${data.pettyCashByEmployee.length} موظف`}
                  icon={DollarSign}
                  accent="brand"
                />
                <StatCard
                  title="عدد العمليات"
                  value={data.pettyCashSummary.transactionCount}
                  subtitle="سجل عهد"
                  icon={Wallet}
                  accent="warning"
                />
              </>
            ) : (
              <>
                <StatCard
                  title="إجمالي الإيرادات"
                  value={formatCurrency(data.summary.totalRevenue)}
                  subtitle="قيمة العقود"
                  icon={TrendingUp}
                  accent="success"
                  valueTone="positive"
                />
                <StatCard
                  title="إجمالي المصروفات"
                  value={formatCurrency(data.summary.totalExpenses)}
                  subtitle="مصروفات + مستخلصات + مشتريات"
                  icon={TrendingDown}
                  accent="danger"
                  valueTone="negative"
                />
                <StatCard
                  title="إجمالي الأرباح"
                  value={formatCurrency(data.summary.totalProfit)}
                  subtitle={data.summary.totalProfit >= 0 ? "ربح متوقع" : "خسارة"}
                  icon={DollarSign}
                  accent="brand"
                  valueTone={data.summary.totalProfit >= 0 ? "positive" : "negative"}
                />
                <StatCard
                  title="هامش الربح"
                  value={`${data.summary.profitMargin}%`}
                  subtitle={filterLabel}
                  icon={Percent}
                  accent="info"
                />
              </>
            )}
          </div>

          {tab === "overview" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <PanelCard title="التدفق النقدي الشهري" className="xl:col-span-2">
                <p className="mb-4 text-xs text-slate-500">
                  الإيرادات = المستخلصات المعتمدة · المصروفات = مصروفات معتمدة + مشتريات
                </p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyCashFlow} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="monthLabel" tick={{ fill: CHART.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickFormatter={formatAxisValue} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                      <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke={CHART.income} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="expenses" name="المصروفات" stroke={CHART.expense} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard title="المصروفات حسب التصنيف">
                {data.expensesByCategory.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">لا توجد مصروفات معتمدة</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expensesByCategory}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {data.expensesByCategory.map((e) => (
                            <Cell key={e.category} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </PanelCard>

              <PanelCard title="تحليل المصروفات">
                {data.expensesByCategory.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-1">
                    {data.expensesByCategory.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                          <span className="truncate text-sm text-slate-300">{item.category}</span>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className="text-sm tabular-nums text-money-negative">{formatCurrency(item.amount)}</p>
                          <p className="text-xs text-slate-500">{item.percent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>
          )}

          {tab === "projects" && (
            <PanelCard title={`تقرير المشاريع — ${filterLabel}`}>
              <DataTable
                headers={["المشروع", "العميل", "قيمة العقد", "المصروفات", "المستخلصات", "المشتريات", "الربح", "الهامش", "الإنجاز"]}
                empty="لا توجد مشاريع"
                rows={data.projects.map((p) => [
                  p.name,
                  p.client,
                  <span key="cv" className="text-money-positive">{formatCurrency(p.contractValue)}</span>,
                  formatCurrency(p.expenses),
                  formatCurrency(p.extracts),
                  formatCurrency(p.purchases),
                  <span key="pr" className={p.profit >= 0 ? "text-money-positive" : "text-money-negative"}>{formatCurrency(p.profit)}</span>,
                  `${p.profitMargin}%`,
                  `${p.progressPercent}%`,
                ])}
              />
            </PanelCard>
          )}

          {tab === "contractors" && (
            <PanelCard title={`تقرير المقاولين — ${filterLabel}`}>
              <DataTable
                headers={["المقاول", "قيمة العقود", "المدفوع (مستخلصات)", "المتبقي"]}
                empty="لا توجد بيانات مقاولين"
                rows={data.contractors.map((c) => [
                  c.name,
                  formatCurrency(c.contractValue),
                  <span key="paid" className="text-money-negative">{formatCurrency(c.paid)}</span>,
                  formatCurrency(c.remaining),
                ])}
              />
            </PanelCard>
          )}

          {tab === "suppliers" && (
            <PanelCard title={`تقرير الموردين — ${filterLabel}`}>
              <DataTable
                headers={["المورد", "التصنيف", "إجمالي المشتريات", "المدفوع", "المتبقي"]}
                empty="لا توجد بيانات موردين"
                rows={data.suppliers.map((s) => [
                  s.name,
                  s.category ?? "—",
                  formatCurrency(s.purchases),
                  formatCurrency(s.paid),
                  formatCurrency(s.remaining),
                ])}
              />
            </PanelCard>
          )}

          {tab === "expenses" && (
            <PanelCard title={`تفاصيل المصروفات — ${filterLabel}`}>
              <DataTable
                headers={["التاريخ", "العنوان", "المشروع", "التصنيف", "المبلغ", "الحالة", "مقدّم من"]}
                empty="لا توجد مصروفات"
                rows={data.expenseRows.map((e) => [
                  formatDate(e.expenseDate),
                  e.title,
                  e.projectName,
                  e.category,
                  <span key="amt" className="text-money-negative">{formatCurrency(e.amount)}</span>,
                  STATUS_LABELS[e.status] ?? e.status,
                  e.submittedBy,
                ])}
              />
            </PanelCard>
          )}

          {tab === "extracts" && (
            <PanelCard title={`تفاصيل المستخلصات — ${filterLabel}`}>
              <DataTable
                headers={["التاريخ", "الرقم", "العنوان", "المشروع", "المقاول", "المبلغ", "الحالة"]}
                empty="لا توجد مستخلصات"
                rows={data.extractRows.map((e) => [
                  formatDate(e.extractDate),
                  e.extractNumber,
                  e.title,
                  e.projectName,
                  e.contractorName,
                  <span key="amt" className="text-money-positive">{formatCurrency(e.amount)}</span>,
                  STATUS_LABELS[e.status] ?? e.status,
                ])}
              />
            </PanelCard>
          )}

          {tab === "petty" && (
            <PanelCard
              title="العهد حسب الموظف"
              action={
                <button
                  type="button"
                  onClick={() => data.pettyCashByEmployee.length
                    ? exportPettyCashCsv(data.pettyCashByEmployee)
                    : undefined}
                  disabled={data.pettyCashByEmployee.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  تصدير Excel
                </button>
              }
            >
              <DataTable
                headers={["الموظف", "عدد العهد", "المخصص", "المستخدم", "المتبقي"]}
                empty="لا توجد عهد"
                rows={data.pettyCashByEmployee.map((p) => [
                  p.name,
                  <span key="cnt" className="inline-flex items-center gap-1 tabular-nums text-slate-400">
                    <Hash className="h-3 w-3" />
                    {p.count}
                  </span>,
                  formatCurrency(p.allocated),
                  <span key="used" className="text-money-negative">{formatCurrency(p.used)}</span>,
                  <span key="rem" className="text-money-positive">{formatCurrency(p.remaining)}</span>,
                ])}
              />
            </PanelCard>
          )}
        </>
      )}
    </AppShell>
  );
}
