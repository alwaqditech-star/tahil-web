"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/components/require-role";
import { canViewReports } from "@/lib/permissions";
import { StatCard } from "@/components/ui/stat-card";
import { PanelCard } from "@/components/ui/panel-card";
import { CHART, ChartTooltip, formatAxisValue } from "@/components/ui/charts";
import { useAuth } from "@/contexts/auth-context";
import { api, type FinancialReport, type ProjectReport, type ContractorReport, type SupplierReport, type ExpenseReport, type ExpenseReportFilters, type ExtractReport, type ExtractReportFilters, type PettyCashReport, type ReportDateFilters } from "@/lib/api";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import {
  printContractorReportPdf, printExpenseReportPdf, printExtractReportPdf,
  printFinancialOverviewPdf, printPettyCashReportPdf, printEmployeePettyReportPdf, printProjectReportPdf, printSupplierReportPdf,
} from "@/lib/report-pdf";
import { Badge, statusVariant } from "@/components/ui/badge";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Loader2, RefreshCw, Filter,
  Wallet, Download, Hash, FileText, Wrench, Clock, Banknote, Building2,
  HardHat, Phone, Mail, Package, Receipt, Layers, Printer, ChevronDown, ChevronUp,
} from "lucide-react";

function matchesSearch(text: string, query: string) {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function ExportActions({ onCsv, onPdf, disabled }: { onCsv: () => void; onPdf: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCsv}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" />
        Excel
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
      >
        <Printer className="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  );
}

const EMPTY_SHARED_FILTERS: ReportDateFilters = { projectId: "all", fromDate: "", toDate: "", status: "all" };

const EMPTY_EXPENSE_FILTERS: ExpenseReportFilters = {
  projectId: "all",
  category: "all",
  status: "all",
  fromDate: "",
  toDate: "",
};

const EMPTY_EXTRACT_FILTERS: ExtractReportFilters = {
  projectId: "all",
  contractorId: "all",
  status: "all",
  fromDate: "",
  toDate: "",
};

const EXTRACT_STATUSES = ["draft", "submitted", "manager_approved", "approved", "paid", "rejected"];

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

const filterSelectClass = "w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]";

function ReportFiltersCard({
  onReset,
  projectId,
  onProjectChange,
  projectsList,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  showProject = true,
}: {
  onReset: () => void;
  projectId: number | "all";
  onProjectChange: (v: number | "all") => void;
  projectsList: Array<{ id: number; name: string }>;
  fromDate: string;
  toDate: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  children?: React.ReactNode;
  showProject?: boolean;
}) {
  return (
    <div className="mb-6 glass-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Filter className="h-4 w-4" />
          فلاتر التقرير
        </label>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white">
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة تعيين
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {showProject && (
          <div>
            <label className="mb-1.5 block text-xs text-slate-500">المشروع</label>
            <select
              value={projectId === "all" ? "all" : String(projectId)}
              onChange={(e) => onProjectChange(e.target.value === "all" ? "all" : Number(e.target.value))}
              className={filterSelectClass}
            >
              <option value="all">الكل</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">من تاريخ</label>
          <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className={filterSelectClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">إلى تاريخ</label>
          <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className={filterSelectClass} />
        </div>
        {children}
      </div>
      <div className="mt-4">
        <label className="mb-1.5 block text-xs text-slate-500">بحث بالاسم</label>
        <input type="search" value={searchValue} onChange={(e) => onSearchChange(e.target.value)} placeholder={searchPlaceholder} className={filterSelectClass} />
      </div>
    </div>
  );
}

function exportPettyCashCsv(rows: PettyCashReport["byEmployee"]) {
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

function exportExtractsReportCsv(rows: ExtractReport["rows"]) {
  const headers = ["الرقم", "التاريخ", "المشروع", "المقاول", "العنوان", "المبلغ", "الحالة"];
  const lines = rows.map((e) => [
    e.extractNumber,
    e.extractDate,
    e.projectName,
    e.contractorName,
    e.title,
    String(e.amount),
    STATUS_LABELS[e.status] ?? e.status,
  ]);
  const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "المستخلصات.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportExpensesCsv(rows: ExpenseReport["rows"]) {
  const headers = ["التاريخ", "العنوان", "المشروع", "التصنيف", "المبلغ", "الحالة", "مقدّم من"];
  const lines = rows.map((e) => [
    e.expenseDate,
    e.title,
    e.projectName,
    e.category,
    String(e.amount),
    STATUS_LABELS[e.status] ?? e.status,
    e.submittedBy,
  ]);
  const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "المصروفات.csv";
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
  const [sharedFilters, setSharedFilters] = useState<ReportDateFilters>(EMPTY_SHARED_FILTERS);
  const [projectReportId, setProjectReportId] = useState<number | null>(null);
  const [contractorReportId, setContractorReportId] = useState<number | null>(null);
  const [supplierReportId, setSupplierReportId] = useState<number | null>(null);
  const [data, setData] = useState<FinancialReport | null>(null);
  const [projectReport, setProjectReport] = useState<ProjectReport | null>(null);
  const [contractorReport, setContractorReport] = useState<ContractorReport | null>(null);
  const [supplierReport, setSupplierReport] = useState<SupplierReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [contractorLoading, setContractorLoading] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [contractorError, setContractorError] = useState<string | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [contractorOptions, setContractorOptions] = useState<Array<{ id: number; name: string; companyName?: string | null }>>([]);
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: number; name: string; companyName?: string | null; category?: string | null }>>([]);
  const [expenseFilters, setExpenseFilters] = useState<ExpenseReportFilters>(EMPTY_EXPENSE_FILTERS);
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [extractFilters, setExtractFilters] = useState<ExtractReportFilters>(EMPTY_EXTRACT_FILTERS);
  const [extractReport, setExtractReport] = useState<ExtractReport | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pettyReport, setPettyReport] = useState<PettyCashReport | null>(null);
  const [pettyLoading, setPettyLoading] = useState(false);
  const [pettyError, setPettyError] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState("");
  const [rowSearchName, setRowSearchName] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const report = await api.reports.financial(token, sharedFilters);
      setData(report);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setLoading(false);
    }
  }, [token, sharedFilters]);

  const loadProjectReport = useCallback(async (id: number) => {
    if (!token) return;
    setProjectLoading(true);
    setProjectError(null);
    try {
      const report = await api.reports.project(token, id, sharedFilters);
      setProjectReport(report);
    } catch (err) {
      setProjectReport(null);
      setProjectError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setProjectLoading(false);
    }
  }, [token, sharedFilters]);

  const loadContractorReport = useCallback(async (id: number) => {
    if (!token) return;
    setContractorLoading(true);
    setContractorError(null);
    try {
      const report = await api.reports.contractor(token, id, sharedFilters);
      setContractorReport(report);
    } catch (err) {
      setContractorReport(null);
      setContractorError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setContractorLoading(false);
    }
  }, [token, sharedFilters]);

  const loadSupplierReport = useCallback(async (id: number) => {
    if (!token) return;
    setSupplierLoading(true);
    setSupplierError(null);
    try {
      const report = await api.reports.supplier(token, id, sharedFilters);
      setSupplierReport(report);
    } catch (err) {
      setSupplierReport(null);
      setSupplierError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setSupplierLoading(false);
    }
  }, [token, sharedFilters]);

  const loadExpenseReport = useCallback(async (filters: ExpenseReportFilters) => {
    if (!token) return;
    setExpenseLoading(true);
    setExpenseError(null);
    try {
      const report = await api.reports.expenses(token, filters);
      setExpenseReport(report);
    } catch (err) {
      setExpenseReport(null);
      setExpenseError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setExpenseLoading(false);
    }
  }, [token]);

  const loadExtractReport = useCallback(async (filters: ExtractReportFilters) => {
    if (!token) return;
    setExtractLoading(true);
    setExtractError(null);
    try {
      const report = await api.reports.extracts(token, filters);
      setExtractReport(report);
    } catch (err) {
      setExtractReport(null);
      setExtractError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setExtractLoading(false);
    }
  }, [token]);

  const loadPettyReport = useCallback(async (filters: ReportDateFilters) => {
    if (!token) return;
    setPettyLoading(true);
    setPettyError(null);
    try {
      const report = await api.reports.pettyCash(token, filters);
      setPettyReport(report);
    } catch (err) {
      setPettyReport(null);
      setPettyError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setPettyLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setRowSearchName("");
    setEntitySearch("");
    setExpandedEmployeeId(null);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token) return;
    api.suppliers(token).list()
      .then((list) => setSupplierOptions(list.map((s) => ({ id: s.id, name: s.name, companyName: s.companyName, category: s.category }))))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.contractors(token).list()
      .then((list) => setContractorOptions(list.map((c) => ({ id: c.id, name: c.name, companyName: c.companyName }))))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!data?.projectsList.length) return;
    if (tab === "projects") {
      const id = sharedFilters.projectId !== "all" && sharedFilters.projectId != null
        ? sharedFilters.projectId
        : (projectReportId ?? data.projectsList[0].id);
      if (id && projectReportId !== id) setProjectReportId(id);
    }
  }, [tab, data, sharedFilters.projectId, projectReportId]);

  useEffect(() => {
    if (tab === "projects" && projectReportId) loadProjectReport(projectReportId);
  }, [tab, projectReportId, loadProjectReport]);

  useEffect(() => {
    const list = contractorOptions.length ? contractorOptions : (data?.contractors ?? []).map((c) => ({ id: c.id, name: c.name, companyName: null }));
    if (!list.length) return;
    if (tab === "contractors" && !contractorReportId) {
      setContractorReportId(list[0].id);
    }
  }, [tab, data, contractorReportId, contractorOptions]);

  useEffect(() => {
    if (tab === "contractors" && contractorReportId) loadContractorReport(contractorReportId);
  }, [tab, contractorReportId, loadContractorReport]);

  useEffect(() => {
    const list = supplierOptions.length ? supplierOptions : (data?.suppliers ?? []).map((s) => ({ id: s.id, name: s.name, companyName: null, category: s.category }));
    if (!list.length) return;
    if (tab === "suppliers" && !supplierReportId) {
      setSupplierReportId(list[0].id);
    }
  }, [tab, data, supplierReportId, supplierOptions]);

  useEffect(() => {
    if (tab === "suppliers" && supplierReportId) loadSupplierReport(supplierReportId);
  }, [tab, supplierReportId, loadSupplierReport]);

  useEffect(() => {
    if (tab === "expenses") loadExpenseReport(expenseFilters);
  }, [tab, expenseFilters, loadExpenseReport]);

  useEffect(() => {
    if (tab === "extracts") loadExtractReport(extractFilters);
  }, [tab, extractFilters, loadExtractReport]);

  useEffect(() => {
    if (tab === "petty") loadPettyReport(sharedFilters);
  }, [tab, loadPettyReport, sharedFilters]);

  const filterLabel = sharedFilters.projectId === "all"
    ? "جميع المشاريع"
    : data?.projectsList.find((p) => p.id === sharedFilters.projectId)?.name ?? "مشروع محدد";

  const projectsListForFilters = data?.projectsList ?? expenseReport?.projectsList ?? extractReport?.projectsList ?? pettyReport?.projectsList ?? [];

  const filteredPettyEmployees = useMemo(() => {
    if (!pettyReport) return [];
    return pettyReport.byEmployee.filter((e) => matchesSearch(e.name, entitySearch));
  }, [pettyReport, entitySearch]);

  const filteredProjectsList = useMemo(
    () => (data?.projectsList ?? []).filter((p) => matchesSearch(p.name, entitySearch)),
    [data, entitySearch],
  );

  const filteredContractorOptions = useMemo(() => {
    const list = contractorOptions.length
      ? contractorOptions
      : (data?.contractors ?? []).map((c) => ({ id: c.id, name: c.name, companyName: null as string | null }));
    return list.filter((c) => matchesSearch(c.companyName ? `${c.name} ${c.companyName}` : c.name, entitySearch));
  }, [contractorOptions, data, entitySearch]);

  const filteredSupplierOptions = useMemo(() => {
    const list = supplierOptions.length
      ? supplierOptions
      : (data?.suppliers ?? []).map((s) => ({ id: s.id, name: s.name, companyName: null as string | null, category: s.category }));
    return list.filter((s) => matchesSearch(s.companyName ? `${s.name} ${s.companyName}` : s.name, entitySearch));
  }, [supplierOptions, data, entitySearch]);

  const filteredExpenseRows = useMemo(() => {
    if (!expenseReport) return [];
    return expenseReport.rows.filter((e) =>
      matchesSearch(`${e.title} ${e.projectName} ${e.submittedBy ?? ""}`, rowSearchName),
    );
  }, [expenseReport, rowSearchName]);

  const filteredExtractRows = useMemo(() => {
    if (!extractReport) return [];
    return extractReport.rows.filter((e) =>
      matchesSearch(`${e.extractNumber} ${e.title ?? ""} ${e.projectName} ${e.contractorName}`, rowSearchName),
    );
  }, [extractReport, rowSearchName]);

  return (
    <RequireRole allow={canViewReports}>
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
      {tab === "expenses" ? (
        <div className="mb-6 glass-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="h-4 w-4" />
              فلاتر التقرير
            </label>
            <button
              type="button"
              onClick={() => setExpenseFilters(EMPTY_EXPENSE_FILTERS)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة تعيين
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">المشروع</label>
              <select
                value={expenseFilters.projectId === "all" || !expenseFilters.projectId ? "all" : String(expenseFilters.projectId)}
                onChange={(e) => setExpenseFilters((f) => ({ ...f, projectId: e.target.value === "all" ? "all" : Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {(expenseReport?.projectsList ?? data?.projectsList ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">التصنيف</label>
              <select
                value={expenseFilters.category ?? "all"}
                onChange={(e) => setExpenseFilters((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {(expenseReport?.categories ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">الحالة</label>
              <select
                value={expenseFilters.status ?? "all"}
                onChange={(e) => setExpenseFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {["pending", "manager_approved", "approved", "rejected"].map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">من تاريخ</label>
              <input
                type="date"
                value={expenseFilters.fromDate ?? ""}
                onChange={(e) => setExpenseFilters((f) => ({ ...f, fromDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">إلى تاريخ</label>
              <input
                type="date"
                value={expenseFilters.toDate ?? ""}
                onChange={(e) => setExpenseFilters((f) => ({ ...f, toDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs text-slate-500">بحث بالاسم</label>
            <input
              type="search"
              value={rowSearchName}
              onChange={(e) => setRowSearchName(e.target.value)}
              placeholder="عنوان، مشروع، مقدّم..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>
      ) : tab === "extracts" ? (
        <div className="mb-6 glass-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="h-4 w-4" />
              فلاتر التقرير
            </label>
            <button
              type="button"
              onClick={() => setExtractFilters(EMPTY_EXTRACT_FILTERS)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة تعيين
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">المشروع</label>
              <select
                value={extractFilters.projectId === "all" || !extractFilters.projectId ? "all" : String(extractFilters.projectId)}
                onChange={(e) => setExtractFilters((f) => ({ ...f, projectId: e.target.value === "all" ? "all" : Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {(extractReport?.projectsList ?? data?.projectsList ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">المقاول</label>
              <select
                value={extractFilters.contractorId === "all" || !extractFilters.contractorId ? "all" : String(extractFilters.contractorId)}
                onChange={(e) => setExtractFilters((f) => ({ ...f, contractorId: e.target.value === "all" ? "all" : Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {(extractReport?.contractorsList ?? contractorOptions.map((c) => ({ id: c.id, name: c.companyName ? `${c.name} — ${c.companyName}` : c.name }))).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">الحالة</label>
              <select
                value={extractFilters.status ?? "all"}
                onChange={(e) => setExtractFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              >
                <option value="all">الكل</option>
                {EXTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">من تاريخ</label>
              <input
                type="date"
                value={extractFilters.fromDate ?? ""}
                onChange={(e) => setExtractFilters((f) => ({ ...f, fromDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">إلى تاريخ</label>
              <input
                type="date"
                value={extractFilters.toDate ?? ""}
                onChange={(e) => setExtractFilters((f) => ({ ...f, toDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs text-slate-500">بحث بالاسم</label>
            <input
              type="search"
              value={rowSearchName}
              onChange={(e) => setRowSearchName(e.target.value)}
              placeholder="رقم، عنوان، مشروع، مقاول..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>
      ) : (
        <ReportFiltersCard
          onReset={() => { setSharedFilters(EMPTY_SHARED_FILTERS); setEntitySearch(""); }}
          projectId={sharedFilters.projectId ?? "all"}
          onProjectChange={(v) => setSharedFilters((f) => ({ ...f, projectId: v }))}
          projectsList={projectsListForFilters}
          fromDate={sharedFilters.fromDate ?? ""}
          toDate={sharedFilters.toDate ?? ""}
          onFromDateChange={(v) => setSharedFilters((f) => ({ ...f, fromDate: v }))}
          onToDateChange={(v) => setSharedFilters((f) => ({ ...f, toDate: v }))}
          searchValue={entitySearch}
          onSearchChange={setEntitySearch}
          searchPlaceholder={
            tab === "projects" ? "اسم المشروع..."
            : tab === "contractors" ? "اسم المقاول..."
            : tab === "suppliers" ? "اسم المورد..."
            : tab === "petty" ? "اسم الموظف..."
            : "بحث..."
          }
          showProject={tab !== "projects"}
        >
          {tab === "projects" && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs text-slate-500">المشروع</label>
              <select
                value={projectReportId ? String(projectReportId) : ""}
                onChange={(e) => setProjectReportId(Number(e.target.value))}
                className={filterSelectClass}
              >
                {filteredProjectsList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {tab === "contractors" && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-slate-500">المقاول</label>
                <select
                  value={contractorReportId ? String(contractorReportId) : ""}
                  onChange={(e) => setContractorReportId(Number(e.target.value))}
                  className={filterSelectClass}
                >
                  {filteredContractorOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.name} — ${c.companyName}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">حالة المستخلص</label>
                <select
                  value={sharedFilters.status ?? "all"}
                  onChange={(e) => setSharedFilters((f) => ({ ...f, status: e.target.value }))}
                  className={filterSelectClass}
                >
                  <option value="all">الكل</option>
                  {EXTRACT_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {tab === "suppliers" && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs text-slate-500">المورد</label>
              <select
                value={supplierReportId ? String(supplierReportId) : ""}
                onChange={(e) => setSupplierReportId(Number(e.target.value))}
                className={filterSelectClass}
              >
                {filteredSupplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName ? `${s.name} — ${s.companyName}` : s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </ReportFiltersCard>
      )}

      {(loading && tab === "overview") && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
          <p className="text-sm text-slate-500">جاري تحميل التقرير...</p>
        </div>
      )}

      {!loading && error && tab === "overview" && (
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

      {!loading && data && tab !== "projects" && tab !== "contractors" && tab !== "suppliers" && tab !== "expenses" && tab !== "extracts" && tab !== "petty" && (
          <>
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => data && printFinancialOverviewPdf(data, filterLabel)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة PDF
            </button>
          </div>
          {/* KPI Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        </>
      )}

      {tab === "projects" && !loading && data && (
        <>
          {projectLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير المشروع...</p>
            </div>
          )}

          {!projectLoading && projectError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{projectError}</p>
              <button
                type="button"
                onClick={() => projectReportId && loadProjectReport(projectReportId)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!projectLoading && projectReport && (
            <>
              {/* بطاقة تفاصيل المشروع */}
              <div className="mb-6 glass-card p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]/20">
                      <Building2 className="h-5 w-5 text-[var(--brand)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{projectReport.project.name}</h3>
                      <p className="text-sm text-slate-400">
                        {projectReport.project.client}
                        {projectReport.project.location ? ` — ${projectReport.project.location}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => printProjectReportPdf(projectReport)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <Badge variant={statusVariant(projectReport.project.status)}>
                      {STATUS_LABELS[projectReport.project.status] ?? projectReport.project.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    { label: "قيمة العقد", value: formatCurrency(projectReport.project.contractValue), tone: "positive" as const },
                    { label: "الميزانية المعتمدة", value: formatCurrency(projectReport.project.budgetAllocated) },
                    { label: "نسبة الإنجاز", value: `${projectReport.project.progressPercent}%` },
                    { label: "تاريخ البداية", value: formatDate(projectReport.project.startDate) },
                    { label: "تاريخ النهاية", value: formatDate(projectReport.project.endDate) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/3 p-3">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className={`mt-1 text-sm font-semibold tabular-nums ${item.tone === "positive" ? "text-money-positive" : "text-white"}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* بطاقات KPI */}
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="مصروفات معتمدة" value={formatCurrency(projectReport.summary.totalExpenses)} icon={TrendingDown} accent="danger" valueTone="negative" />
                <StatCard title="إجمالي المصروفات" value={formatCurrency(projectReport.summary.totalExpensesAll)} subtitle="كل الحالات" icon={Receipt} accent="warning" valueTone="negative" />
                <StatCard title="مصروفات معلقة" value={formatCurrency(projectReport.summary.pendingExpenses)} subtitle="غير معتمدة/مدفوعة" icon={Clock} accent="default" />
                <StatCard title="مصروفات مدفوعة" value={formatCurrency(projectReport.summary.paidExpenses)} icon={TrendingUp} accent="success" valueTone="positive" />
                <StatCard title="إجمالي المستخلصات" value={formatCurrency(projectReport.summary.totalExtracts)} icon={FileText} accent="info" />
                <StatCard title="مستخلصات مدفوعة" value={formatCurrency(projectReport.summary.paidExtracts)} icon={TrendingUp} accent="success" valueTone="positive" />
                <StatCard title="هامش الربح" value={`${projectReport.summary.profitMargin}%`} icon={DollarSign} accent="brand" />
                <StatCard title="عدد البنود" value={projectReport.summary.itemsCount} icon={Wrench} accent="default" />
                <StatCard title="نسبة استهلاك الميزانية" value={`${projectReport.summary.budgetConsumptionPercent}%`} icon={Clock} accent="warning" />
                <StatCard title="إجمالي المشتريات" value={formatCurrency(projectReport.summary.totalPurchases)} icon={Banknote} accent="info" />
                <StatCard title="إجمالي العهد المستخدمة" value={formatCurrency(projectReport.summary.pettyCashUsed)} icon={Wallet} accent="warning" />
              </div>

              <PanelCard title="المصروفات حسب التصنيف" className="mb-6">
                {projectReport.expensesByCategory.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">لا توجد مصروفات معتمدة</p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectReport.expensesByCategory} margin={{ top: 8, right: 12, left: 4, bottom: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="category" tick={{ fill: CHART.axis, fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickFormatter={formatAxisValue} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="amount" name="المبلغ" fill={CHART.contract} radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </PanelCard>

              <PanelCard title="بنود العقد">
                <DataTable
                  headers={["الوصف", "الوحدة", "الكمية", "سعر الوحدة", "الإجمالي", "المنجز"]}
                  empty="لا توجد بنود مسجّلة"
                  rows={projectReport.contractItems.map((item) => [
                    <span key="desc" className="font-medium">{item.description}</span>,
                    item.unit,
                    <span key="qty" className="tabular-nums">{item.quantity.toLocaleString("ar-SA")}</span>,
                    <span key="up" className="tabular-nums">{formatCurrency(item.unitPrice)}</span>,
                    <span key="tot" className="tabular-nums text-money-positive">{formatCurrency(item.total)}</span>,
                    <span key="prog" className="tabular-nums text-slate-400">
                      {item.executedQuantity.toLocaleString("ar-SA")} / {item.quantity.toLocaleString("ar-SA")}
                      <span className="mr-2 text-xs text-slate-500">({item.progressPercent}%)</span>
                    </span>,
                  ])}
                />
              </PanelCard>
            </>
          )}

          {!projectLoading && !projectReport && !projectError && data.projectsList.length === 0 && (
            <p className="py-16 text-center text-slate-500">لا توجد مشاريع لعرض التقرير</p>
          )}
        </>
      )}

      {tab === "contractors" && !loading && data && (
        <>
          {contractorLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير المقاول...</p>
            </div>
          )}

          {!contractorLoading && contractorError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{contractorError}</p>
              <button
                type="button"
                onClick={() => contractorReportId && loadContractorReport(contractorReportId)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!contractorLoading && contractorReport && (
            <>
              <div className="mb-6 glass-card p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                      <HardHat className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{contractorReport.contractor.name}</h3>
                      <p className="text-sm text-slate-400">
                        {contractorReport.contractor.companyName ?? contractorReport.contractor.specialty ?? "—"}
                        {contractorReport.contractor.specialty && contractorReport.contractor.companyName
                          ? ` — ${contractorReport.contractor.specialty}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => printContractorReportPdf(contractorReport)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <Badge variant={statusVariant(contractorReport.contractor.status)}>
                      {STATUS_LABELS[contractorReport.contractor.status] ?? contractorReport.contractor.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {contractorReport.contractor.phone && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">الهاتف:</span>
                      <span dir="ltr">{contractorReport.contractor.phone}</span>
                    </div>
                  )}
                  {contractorReport.contractor.email && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">البريد:</span>
                      <span dir="ltr">{contractorReport.contractor.email}</span>
                    </div>
                  )}
                  {contractorReport.contractor.vatNumber && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">الرقم الضريبي:</span>
                      <span dir="ltr">{contractorReport.contractor.vatNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="نسبة الإنجاز" value={`${contractorReport.summary.completionPercent}%`} icon={Clock} accent="info" />
                <StatCard title="إجمالي المستخلصات" value={formatCurrency(contractorReport.summary.totalExtracts)} icon={FileText} accent="info" />
                <StatCard title="القيمة المنجزة" value={formatCurrency(contractorReport.summary.completedValue)} icon={TrendingUp} accent="success" valueTone="positive" />
                <StatCard title="قيمة العقود" value={formatCurrency(contractorReport.summary.contractValue)} icon={DollarSign} accent="brand" />
                <StatCard title="عدد المستخلصات" value={contractorReport.summary.extractsCount} icon={FileText} accent="default" />
                <StatCard title="عدد البنود" value={contractorReport.summary.itemsCount} icon={Wrench} accent="default" />
                <StatCard title="مستحق للمقاول" value={formatCurrency(contractorReport.summary.dueToContractor)} icon={TrendingDown} accent="warning" valueTone="negative" />
                <StatCard title="مدفوع للمقاول" value={formatCurrency(contractorReport.summary.paidToContractor)} icon={TrendingUp} accent="success" valueTone="positive" />
              </div>

              <PanelCard title={`بنود العقد (${contractorReport.contractItems.length})`} className="mb-6">
                <DataTable
                  headers={["الكود", "المشروع", "الوصف", "الكمية", "الإجمالي", "المنجز"]}
                  empty="لا توجد بنود عقد"
                  rows={contractorReport.contractItems.map((item) => [
                    item.itemCode ?? "—",
                    item.projectName,
                    <span key="desc" className="font-medium">{item.description}</span>,
                    <span key="qty" className="tabular-nums">{item.quantity.toLocaleString("ar-SA")} {item.unit}</span>,
                    <span key="tot" className="tabular-nums text-money-positive">{formatCurrency(item.total)}</span>,
                    <span key="done" className="tabular-nums">{item.completedQuantity.toLocaleString("ar-SA")}</span>,
                  ])}
                />
              </PanelCard>

              <PanelCard title={`المستخلصات (${contractorReport.extracts.length})`}>
                <DataTable
                  headers={["رقم المستخلص", "المشروع", "التاريخ", "المبلغ", "الحالة"]}
                  empty="لا توجد مستخلصات"
                  rows={contractorReport.extracts.map((e) => [
                    e.extractNumber,
                    e.projectName,
                    formatDate(e.extractDate),
                    <span key="amt" className="tabular-nums text-money-positive">{formatCurrency(e.amount)}</span>,
                    <Badge key="st" variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge>,
                  ])}
                />
              </PanelCard>
            </>
          )}

          {!contractorLoading && !contractorReport && !contractorError && contractorOptions.length === 0 && (data?.contractors.length ?? 0) === 0 && (
            <p className="py-16 text-center text-slate-500">لا يوجد مقاولون لعرض التقرير</p>
          )}
        </>
      )}

      {tab === "suppliers" && !loading && data && (
        <>
          {supplierLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير المورد...</p>
            </div>
          )}

          {!supplierLoading && supplierError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{supplierError}</p>
              <button
                type="button"
                onClick={() => supplierReportId && loadSupplierReport(supplierReportId)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!supplierLoading && supplierReport && (
            <>
              <div className="mb-6 glass-card p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                      <Package className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{supplierReport.supplier.name}</h3>
                      <p className="text-sm text-slate-400">
                        {supplierReport.supplier.companyName ?? supplierReport.supplier.category ?? "—"}
                        {supplierReport.supplier.category && supplierReport.supplier.companyName
                          ? ` — ${supplierReport.supplier.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => printSupplierReportPdf(supplierReport)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <Badge variant={statusVariant(supplierReport.supplier.status)}>
                      {STATUS_LABELS[supplierReport.supplier.status] ?? supplierReport.supplier.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {supplierReport.supplier.phone && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">الهاتف:</span>
                      <span dir="ltr">{supplierReport.supplier.phone}</span>
                    </div>
                  )}
                  {supplierReport.supplier.email && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">البريد:</span>
                      <span dir="ltr">{supplierReport.supplier.email}</span>
                    </div>
                  )}
                  {supplierReport.supplier.vatNumber && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/3 p-3 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-500">الرقم الضريبي:</span>
                      <span dir="ltr">{supplierReport.supplier.vatNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="إجمالي المشتريات" value={formatCurrency(supplierReport.summary.totalPurchases)} icon={Banknote} accent="info" />
                <StatCard title="المدفوع" value={formatCurrency(supplierReport.summary.paid)} icon={TrendingUp} accent="success" valueTone="positive" />
                <StatCard title="المتبقي" value={formatCurrency(supplierReport.summary.remaining)} icon={TrendingDown} accent="warning" valueTone="negative" />
                <StatCard title="عدد الأوامر" value={supplierReport.summary.ordersCount} icon={FileText} accent="default" />
              </div>

              <PanelCard title={`أوامر الشراء (${supplierReport.purchases.length})`}>
                <DataTable
                  headers={["رقم الأمر", "المشروع", "الاسم", "التاريخ", "الإجمالي", "المدفوع", "الحالة"]}
                  empty="لا توجد أوامر شراء"
                  rows={supplierReport.purchases.map((p) => [
                    p.purchaseNumber,
                    p.projectName,
                    <span key="title" className="font-medium">{p.title}</span>,
                    formatDate(p.orderDate),
                    <span key="amt" className="tabular-nums">{formatCurrency(p.amount)}</span>,
                    <span key="paid" className="tabular-nums text-money-positive">{formatCurrency(p.paidAmount)}</span>,
                    <Badge key="st" variant={statusVariant(p.status)}>{STATUS_LABELS[p.status] ?? p.status}</Badge>,
                  ])}
                />
              </PanelCard>
            </>
          )}

          {!supplierLoading && !supplierReport && !supplierError && supplierOptions.length === 0 && (data?.suppliers.length ?? 0) === 0 && (
            <p className="py-16 text-center text-slate-500">لا يوجد موردون لعرض التقرير</p>
          )}
        </>
      )}

      {tab === "expenses" && (
        <>
          {expenseLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير المصروفات...</p>
            </div>
          )}

          {!expenseLoading && expenseError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{expenseError}</p>
              <button
                type="button"
                onClick={() => loadExpenseReport(expenseFilters)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!expenseLoading && expenseReport && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <StatCard title="عدد العمليات" value={expenseReport.summary.transactionsCount} icon={Hash} accent="default" />
                <StatCard title="إجمالي المصروفات" value={formatCurrency(expenseReport.summary.totalAmount)} icon={Receipt} accent="danger" valueTone="negative" />
                <StatCard title="عدد التصنيفات" value={expenseReport.summary.categoriesCount} icon={Layers} accent="info" />
              </div>

              <PanelCard title="توزيع المصروفات حسب التصنيف" className="mb-6">
                <DataTable
                  headers={["التصنيف", "العدد", "الإجمالي"]}
                  empty="لا توجد مصروفات مطابقة للفلتر"
                  rows={expenseReport.byCategory.map((c) => [
                    c.category,
                    <span key="cnt" className="tabular-nums">{c.count}</span>,
                    <span key="tot" className="tabular-nums text-money-negative">{formatCurrency(c.total)}</span>,
                  ])}
                />
              </PanelCard>

              <PanelCard
                title="تفاصيل المصروفات"
                action={
                  <ExportActions
                    disabled={filteredExpenseRows.length === 0}
                    onCsv={() => exportExpensesCsv(filteredExpenseRows)}
                    onPdf={() => expenseReport && printExpenseReportPdf({ ...expenseReport, rows: filteredExpenseRows })}
                  />
                }
              >
                <DataTable
                  headers={["التاريخ", "العنوان", "المشروع", "التصنيف", "المبلغ", "الحالة"]}
                  empty="لا توجد مصروفات"
                  rows={filteredExpenseRows.map((e) => [
                    formatDate(e.expenseDate),
                    <span key="title" className="font-medium">{e.title}</span>,
                    e.projectName,
                    e.category,
                    <span key="amt" className="tabular-nums text-money-negative">{formatCurrency(e.amount)}</span>,
                    <Badge key="st" variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge>,
                  ])}
                />
              </PanelCard>
            </>
          )}
        </>
      )}

      {tab === "extracts" && (
        <>
          {extractLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير المستخلصات...</p>
            </div>
          )}

          {!extractLoading && extractError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{extractError}</p>
              <button
                type="button"
                onClick={() => loadExtractReport(extractFilters)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!extractLoading && extractReport && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <StatCard title="عدد المستخلصات" value={extractReport.summary.extractsCount} icon={FileText} accent="default" />
                <StatCard title="إجمالي المبلغ" value={formatCurrency(extractReport.summary.totalAmount)} icon={TrendingUp} accent="success" valueTone="positive" />
              </div>

              <PanelCard
                title="تفاصيل المستخلصات"
                action={
                  <ExportActions
                    disabled={filteredExtractRows.length === 0}
                    onCsv={() => exportExtractsReportCsv(filteredExtractRows)}
                    onPdf={() => extractReport && printExtractReportPdf({ ...extractReport, rows: filteredExtractRows })}
                  />
                }
              >
                <DataTable
                  headers={["الرقم", "التاريخ", "المشروع", "المقاول", "المبلغ", "الحالة"]}
                  empty="لا توجد مستخلصات"
                  rows={filteredExtractRows.map((e) => [
                    e.extractNumber,
                    formatDate(e.extractDate),
                    e.projectName,
                    e.contractorName,
                    <span key="amt" className="tabular-nums text-money-positive">{formatCurrency(e.amount)}</span>,
                    <Badge key="st" variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge>,
                  ])}
                />
              </PanelCard>
            </>
          )}
        </>
      )}

      {tab === "petty" && (
        <>
          {pettyLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
              <p className="text-sm text-slate-500">جاري تحميل تقرير العهد...</p>
            </div>
          )}

          {!pettyLoading && pettyError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-rose-400">{pettyError}</p>
              <button
                type="button"
                onClick={() => loadPettyReport(sharedFilters)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!pettyLoading && pettyReport && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="إجمالي المتبقي" value={formatCurrency(pettyReport.summary.totalRemaining)} icon={TrendingUp} accent="success" valueTone="positive" />
                <StatCard title="إجمالي المستخدم" value={formatCurrency(pettyReport.summary.totalUsed)} icon={TrendingDown} accent="danger" valueTone="negative" />
                <StatCard title="إجمالي المخصص" value={formatCurrency(pettyReport.summary.totalAllocated)} subtitle={`${filteredPettyEmployees.length} موظف`} icon={DollarSign} accent="brand" />
                <StatCard title="عدد العمليات" value={pettyReport.summary.transactionCount} subtitle="سجل عهد" icon={Wallet} accent="warning" />
              </div>

              <PanelCard
                title="العهد حسب الموظف"
                action={
                  <ExportActions
                    disabled={filteredPettyEmployees.length === 0}
                    onCsv={() => exportPettyCashCsv(filteredPettyEmployees)}
                    onPdf={() => printPettyCashReportPdf(pettyReport)}
                  />
                }
              >
                {filteredPettyEmployees.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">لا توجد عهد مطابقة للفلتر</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="w-10 p-3" />
                          <th className="px-3 py-3 text-right font-medium">الموظف</th>
                          <th className="px-3 py-3 text-right font-medium">عدد العهد</th>
                          <th className="px-3 py-3 text-right font-medium">المخصص</th>
                          <th className="px-3 py-3 text-right font-medium">المستخدم</th>
                          <th className="px-3 py-3 text-right font-medium">المتبقي</th>
                          <th className="px-3 py-3 text-right font-medium">المصروفات</th>
                          <th className="px-3 py-3 text-right font-medium">طباعة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPettyEmployees.map((emp) => (
                          <Fragment key={emp.userId}>
                            <tr className={`erp-interactive border-b border-white/5 ${expandedEmployeeId === emp.userId ? "bg-white/5" : ""}`}>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => setExpandedEmployeeId(expandedEmployeeId === emp.userId ? null : emp.userId)}
                                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                                >
                                  {expandedEmployeeId === emp.userId
                                    ? <ChevronUp className="h-4 w-4" />
                                    : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                              <td className="px-3 py-3 font-semibold text-white">{emp.name}</td>
                              <td className="px-3 py-3 tabular-nums text-slate-300">
                                <span className="inline-flex items-center gap-1">
                                  <Hash className="h-3 w-3 text-slate-500" />
                                  {emp.count}
                                </span>
                              </td>
                              <td className="px-3 py-3 tabular-nums text-slate-200">{formatCurrency(emp.allocated)}</td>
                              <td className="px-3 py-3 tabular-nums text-money-negative">{formatCurrency(emp.used)}</td>
                              <td className="px-3 py-3 tabular-nums text-money-positive">{formatCurrency(emp.remaining)}</td>
                              <td className="px-3 py-3 tabular-nums text-slate-300">
                                {emp.expenseCount > 0
                                  ? `${emp.expenseCount} — ${formatCurrency(emp.expenseTotal)}`
                                  : "—"}
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => printEmployeePettyReportPdf(emp)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  PDF
                                </button>
                              </td>
                            </tr>
                            {expandedEmployeeId === emp.userId && (
                              <tr>
                                <td colSpan={8} className="border-b border-white/5 bg-white/2 p-0">
                                  <div className="space-y-6 p-5">
                                    <div>
                                      <h4 className="mb-3 text-sm font-bold text-white">
                                        سجلات العهد ({emp.custodies.length})
                                      </h4>
                                      {emp.custodies.length === 0 ? (
                                        <p className="text-sm text-slate-500">لا توجد سجلات عهد</p>
                                      ) : (
                                        <div className="overflow-x-auto rounded-xl border border-white/10">
                                          <table className="w-full min-w-[640px] text-sm">
                                            <thead>
                                              <tr className="border-b border-white/10 bg-white/3 text-slate-400">
                                                <th className="px-3 py-2.5 text-right font-medium">الغرض</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المشروع</th>
                                                <th className="px-3 py-2.5 text-right font-medium">التاريخ</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المخصص</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المستخدم</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المتبقي</th>
                                                <th className="px-3 py-2.5 text-right font-medium">الحالة</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {emp.custodies.map((c) => (
                                                <tr key={c.id} className="border-b border-white/5 last:border-0">
                                                  <td className="px-3 py-2.5 font-medium text-slate-200">{c.purpose}</td>
                                                  <td className="px-3 py-2.5 text-slate-300">{c.projectName}</td>
                                                  <td className="px-3 py-2.5 text-slate-400">{formatDate(c.issuedDate)}</td>
                                                  <td className="px-3 py-2.5 tabular-nums">{formatCurrency(c.allocatedAmount)}</td>
                                                  <td className="px-3 py-2.5 tabular-nums text-money-negative">{formatCurrency(c.usedAmount)}</td>
                                                  <td className="px-3 py-2.5 tabular-nums text-money-positive">{formatCurrency(c.remaining)}</td>
                                                  <td className="px-3 py-2.5">
                                                    <Badge variant={statusVariant(c.status)}>
                                                      {STATUS_LABELS[c.status] ?? c.status}
                                                    </Badge>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <h4 className="text-sm font-bold text-white">
                                          المصروفات ({emp.expenses.length})
                                        </h4>
                                        {emp.expenses.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => printEmployeePettyReportPdf(emp)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                                          >
                                            <Printer className="h-3.5 w-3.5" />
                                            طباعة مصروفات الموظف
                                          </button>
                                        )}
                                      </div>
                                      {emp.expenses.length === 0 ? (
                                        <p className="text-sm text-slate-500">لا توجد مصروفات مسجّلة لهذا الموظف</p>
                                      ) : (
                                        <div className="overflow-x-auto rounded-xl border border-white/10">
                                          <table className="w-full min-w-[640px] text-sm">
                                            <thead>
                                              <tr className="border-b border-white/10 bg-white/3 text-slate-400">
                                                <th className="px-3 py-2.5 text-right font-medium">التاريخ</th>
                                                <th className="px-3 py-2.5 text-right font-medium">العنوان</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المشروع</th>
                                                <th className="px-3 py-2.5 text-right font-medium">التصنيف</th>
                                                <th className="px-3 py-2.5 text-right font-medium">المبلغ</th>
                                                <th className="px-3 py-2.5 text-right font-medium">الحالة</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {emp.expenses.map((e) => (
                                                <tr key={e.id} className="border-b border-white/5 last:border-0">
                                                  <td className="px-3 py-2.5 text-slate-400">{formatDate(e.expenseDate)}</td>
                                                  <td className="px-3 py-2.5 font-medium text-slate-200">{e.title}</td>
                                                  <td className="px-3 py-2.5 text-slate-300">{e.projectName}</td>
                                                  <td className="px-3 py-2.5 text-slate-300">{e.category}</td>
                                                  <td className="px-3 py-2.5 tabular-nums text-money-negative">{formatCurrency(e.amount)}</td>
                                                  <td className="px-3 py-2.5">
                                                    <Badge variant={statusVariant(e.status)}>
                                                      {STATUS_LABELS[e.status] ?? e.status}
                                                    </Badge>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </PanelCard>
            </>
          )}
        </>
      )}
    </AppShell>
    </RequireRole>
  );
}
