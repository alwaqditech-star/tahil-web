"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { PanelCard } from "@/components/ui/panel-card";
import { CHART, ChartTooltip, formatAxisValue } from "@/components/ui/charts";
import { useAuth } from "@/contexts/auth-context";
import { api, type DashboardStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from "recharts";
import { TrendingUp, Receipt, FileText, Wallet, Loader2 } from "lucide-react";

function truncateName(name: string, max = 18) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.dashboard(token).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <AppShell title="التقارير المالية">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      </AppShell>
    );
  }

  if (!stats) {
    return (
      <AppShell title="التقارير المالية">
        <p className="text-rose-400">خطأ في التحميل</p>
      </AppShell>
    );
  }

  const projectData = stats.topProjects.map((p) => ({
    name: truncateName(p.projectName),
    contract: p.contractValue,
    expenses: p.totalExpenses ?? 0,
  }));

  const distributionData = [
    { name: "المصروفات", value: stats.totalExpenses, fill: CHART.expense },
    { name: "المستخلصات", value: stats.totalExtracts, fill: CHART.income },
    { name: "العهد المفتوحة", value: stats.totalPettyCashOpen, fill: CHART.warning },
  ];

  const projectChartHeight = Math.max(280, projectData.length * 56);
  const hasDistribution = distributionData.some((d) => d.value > 0);

  return (
    <AppShell title="التقارير المالية">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="قيمة العقود" value={formatCurrency(stats.totalContractValue)} icon={TrendingUp} accent="brand" />
        <StatCard title="المصروفات" value={formatCurrency(stats.totalExpenses)} icon={Receipt} accent="danger" valueTone="negative" />
        <StatCard title="المستخلصات" value={formatCurrency(stats.totalExtracts)} icon={FileText} accent="success" valueTone="positive" />
        <StatCard title="العهد المفتوحة" value={formatCurrency(stats.totalPettyCashOpen)} icon={Wallet} accent="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="مقارنة المشاريع">
          <p className="mb-4 text-xs text-slate-500">قيمة العقد مقابل المصروفات المعتمدة</p>
          {projectData.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">لا توجد مشاريع للعرض</p>
          ) : (
            <div className="w-full" style={{ height: projectChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectData}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  barGap={4}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART.axis, fontSize: 11 }}
                    tickFormatter={formatAxisValue}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={128}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 16 }}
                  />
                  <Bar dataKey="contract" fill={CHART.contract} name="قيمة العقد" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="expenses" fill={CHART.expense} name="المصروفات" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>

        <PanelCard title="الملخص المالي">
          {!hasDistribution ? (
            <p className="py-10 text-center text-sm text-slate-500">لا توجد حركة مالية مسجّلة</p>
          ) : (
            <>
              <div className="w-full" style={{ height: Math.max(200, distributionData.filter((d) => d.value > 0).length * 64) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distributionData.filter((d) => d.value > 0)}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: CHART.axis, fontSize: 11 }}
                      tickFormatter={formatAxisValue}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={108}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="المبلغ" radius={[0, 4, 4, 0]} barSize={18}>
                      {distributionData.filter((d) => d.value > 0).map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                <StatRow label="المصروفات" value={formatCurrency(stats.totalExpenses)} accent="danger" />
                <StatRow label="المستخلصات" value={formatCurrency(stats.totalExtracts)} accent="success" />
                <StatRow label="العهد المفتوحة" value={formatCurrency(stats.totalPettyCashOpen)} accent="warning" />
              </div>
            </>
          )}
        </PanelCard>
      </div>
    </AppShell>
  );
}
