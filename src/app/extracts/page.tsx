"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, Textarea, Btn, ConfirmDialog } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Extract, type ProjectPickerOption, type Contractor, type SmartExtractItem } from "@/lib/api";
import {
  canCreate, canDelete, canApproveExtractManager, canApproveExtractAccountant, canViewExtracts,
} from "@/lib/permissions";
import { RequireRole } from "@/components/require-role";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import {
  Loader2, Eye, ArrowUpCircle, CheckCircle, DollarSign, Download, Plus, X,
} from "lucide-react";

const emptyForm = () => ({
  projectId: "",
  contractorId: "",
  title: "",
  extractDate: new Date().toISOString().slice(0, 10),
  workPeriodFrom: "",
  workPeriodTo: "",
  notes: "",
});

function exportExtractsCsv(rows: Extract[]) {
  const headers = ["رقم المستخلص", "المشروع", "المقاول", "العنوان", "التاريخ", "القيمة", "الحالة"];
  const lines = rows.map((e) => [
    e.extractNumber,
    e.projectName ?? "",
    e.contractorName ?? "",
    e.title,
    e.extractDate,
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

export default function ExtractsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Extract[]>([]);
  const [projects, setProjects] = useState<ProjectPickerOption[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [details, setDetails] = useState<Extract | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [smartItems, setSmartItems] = useState<SmartExtractItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const ext = await api.extracts(token).list();
      setRows(ext);
    } catch (e) {
      console.error(e);
      setRows([]);
      setError("تعذر تحميل المستخلصات");
    } finally {
      setLoading(false);
    }
    Promise.all([
      api.projects(token).picker(),
      api.contractors(token).list(),
    ]).then(([proj, cont]) => {
      setProjects(proj);
      setContractors(cont);
    }).catch(console.error);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || !form.projectId || !form.contractorId) {
      setSmartItems([]);
      setQtyMap({});
      return;
    }
    setLoadingItems(true);
    api.extracts(token)
      .smartItems(Number(form.projectId), Number(form.contractorId))
      .then((items) => { setSmartItems(items); setQtyMap({}); })
      .catch(() => setSmartItems([]))
      .finally(() => setLoadingItems(false));
  }, [token, form.projectId, form.contractorId]);

  const computedTotal = smartItems.reduce((sum, it) => {
    const q = parseFloat(qtyMap[it.contractItemId] ?? "0");
    if (!isFinite(q) || q <= 0) return sum;
    return sum + q * it.unitPrice;
  }, 0);

  const openAdd = () => {
    setForm(emptyForm());
    setSmartItems([]);
    setQtyMap({});
    setError(null);
    setModal(true);
  };

  const updateQty = (contractItemId: number, value: string, max: number) => {
    let q = parseFloat(value);
    if (value === "" || !isFinite(q)) {
      setQtyMap((prev) => ({ ...prev, [contractItemId]: value }));
      return;
    }
    if (q < 0) q = 0;
    if (q > max) q = max;
    setQtyMap((prev) => ({ ...prev, [contractItemId]: String(q) }));
  };

  const handleAction = async (id: number, action: string) => {
    if (!token) return;
    setActionId(id);
    try {
      await api.extracts(token).patch(id, { action });
      showToast("تم التحديث");
      load();
      if (details?.id === id) {
        const updated = await api.extracts(token).get(id);
        setDetails(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطأ");
    } finally {
      setActionId(null);
    }
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!token) return;
    if (!form.projectId || !form.contractorId || !form.title.trim()) {
      setError("المشروع والمقاول وعنوان المستخلص مطلوبون");
      return;
    }
    if (computedTotal <= 0) {
      setError("أدخل كميات منفذة في البنود");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const lines = smartItems.flatMap((it) => {
        const q = parseFloat(qtyMap[it.contractItemId] ?? "0");
        if (!isFinite(q) || q <= 0) return [];
        return [{
          contractItemId: it.contractItemId,
          projectItemId: it.projectItemId,
          description: it.description,
          unit: it.unit,
          quantity: q,
          unitPrice: it.unitPrice,
        }];
      });

      const created = await api.extracts(token).create({
        projectId: Number(form.projectId),
        contractorId: Number(form.contractorId),
        title: form.title,
        amount: computedTotal,
        extractDate: form.extractDate,
        workPeriodFrom: form.workPeriodFrom || null,
        workPeriodTo: form.workPeriodTo || null,
        notes: form.notes || null,
        status: "draft",
      });

      await api.extracts(token).saveLines(created.id, lines);
      setModal(false);
      showToast("تم إنشاء المستخلص");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try {
      await api.extracts(token).remove(deleteId);
      setDeleteId(null);
      showToast("تم الحذف");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const role = user?.role ?? "";

  return (
    <RequireRole allow={canViewExtracts}>
    <AppShell title="إدارة المستخلصات">
      <div className="mb-6 flex flex-wrap gap-3 justify-end">
        <Btn variant="secondary" onClick={() => rows.length ? exportExtractsCsv(rows) : showToast("لا توجد بيانات")}>
          <Download className="h-4 w-4" /> تصدير Excel
        </Btn>
        {canCreate(role, "extracts") && (
          <Btn onClick={openAdd}><Plus className="h-4 w-4" /> إنشاء مستخلص جديد</Btn>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">لا توجد مستخلصات</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/3">
                  <th className="text-right p-4 font-semibold">رقم المستخلص</th>
                  <th className="text-right p-4 font-semibold">المشروع</th>
                  <th className="text-right p-4 font-semibold">المقاول</th>
                  <th className="text-right p-4 font-semibold">التاريخ</th>
                  <th className="text-right p-4 font-semibold">القيمة</th>
                  <th className="text-right p-4 font-semibold">الحالة</th>
                  <th className="text-right p-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="p-4 font-bold text-white">{e.extractNumber}</td>
                    <td className="p-4 text-slate-200 font-medium">{e.projectName ?? `مشروع #${e.projectId}`}</td>
                    <td className="p-4 text-slate-400">{e.contractorName ?? "—"}</td>
                    <td className="p-4 text-slate-400">{formatDate(e.extractDate)}</td>
                    <td className="p-4 text-money-positive">{formatCurrency(e.amount)}</td>
                    <td className="p-4">
                      <Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDetails(e)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {e.status === "draft" && canCreate(role, "extracts") && (
                          <Btn
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs"
                            onClick={() => handleAction(e.id, "submit")}
                            loading={actionId === e.id}
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" /> تقديم
                          </Btn>
                        )}

                        {e.status === "submitted" && canApproveExtractManager(role) && (
                          <Btn
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs !text-blue-300 !border-blue-500/30"
                            onClick={() => handleAction(e.id, "manager_approve")}
                            loading={actionId === e.id}
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> اعتماد
                          </Btn>
                        )}

                        {e.status === "manager_approved" && canApproveExtractAccountant(role) && (
                          <Btn
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs !text-blue-300 !border-blue-500/30"
                            onClick={() => handleAction(e.id, "accountant_approve")}
                            loading={actionId === e.id}
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> اعتماد
                          </Btn>
                        )}

                        {e.status === "approved" && canApproveExtractAccountant(role) && (
                          <Btn
                            variant="success"
                            className="!px-2 !py-1 !text-xs"
                            onClick={() => handleAction(e.id, "mark_paid")}
                            loading={actionId === e.id}
                          >
                            <DollarSign className="h-3.5 w-3.5" /> سداد
                          </Btn>
                        )}

                        {canDelete(role) && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(e.id)}
                            className="text-rose-400 text-xs px-2 hover:underline"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تفاصيل سريعة */}
      <Modal open={!!details} onClose={() => setDetails(null)} title={`تفاصيل المستخلص ${details?.extractNumber ?? ""}`}>
        {details && (
          <div className="space-y-3 text-sm">
            {[
              ["المشروع", details.projectName],
              ["المقاول", details.contractorName ?? "—"],
              ["العنوان", details.title],
              ["التاريخ", formatDate(details.extractDate)],
              ["القيمة (بدون ضريبة)", formatCurrency(details.amount)],
              ["الحالة", STATUS_LABELS[details.status] ?? details.status],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between gap-4 py-2 border-b border-white/5">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-medium text-left">{val}</span>
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-4">
              <Btn variant="ghost" onClick={() => setDetails(null)}>إغلاق</Btn>
              <Link href={`/extracts/${details.id}`}>
                <Btn variant="secondary">عرض البنود الكاملة</Btn>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* إنشاء مستخلص */}
      <Modal open={modal} onClose={() => setModal(false)} title="إنشاء مستخلص (بدون ضريبة)" wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="المشروع" required>
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, contractorId: "" })} required>
                <option value="">اختر المشروع</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="المقاول" required>
              <Select value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })} required disabled={!form.projectId}>
                <option value="">اختر المقاول</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` — ${c.companyName}` : ""}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="عنوان المستخلص" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: مستخلص شهر مارس" required />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="تاريخ المستخلص" required>
              <Input type="date" value={form.extractDate} onChange={(e) => setForm({ ...form, extractDate: e.target.value })} required />
            </Field>
            <Field label="فترة العمل (من)">
              <Input type="date" value={form.workPeriodFrom} onChange={(e) => setForm({ ...form, workPeriodFrom: e.target.value })} />
            </Field>
            <Field label="فترة العمل (إلى)">
              <Input type="date" value={form.workPeriodTo} onChange={(e) => setForm({ ...form, workPeriodTo: e.target.value })} />
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">بنود العقد للمقاول</p>
            {!form.projectId || !form.contractorId ? (
              <div className="rounded-xl border border-white/10 bg-white/3 p-6 text-center text-sm text-slate-500">
                اختر مشروعاً ومقاولاً لعرض البنود
              </div>
            ) : loadingItems ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin spinner-brand" /></div>
            ) : smartItems.length === 0 ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm text-amber-300">
                لا توجد بنود — أنشئ عقداً من صفحة <strong>العقود</strong> أولاً
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-right p-3">الوصف</th>
                      <th className="text-right p-3">الوحدة</th>
                      <th className="text-right p-3">سعر الوحدة</th>
                      <th className="text-right p-3">المتبقي</th>
                      <th className="text-right p-3">المنفذ في هذا المستخلص</th>
                      <th className="text-right p-3">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartItems.map((it) => {
                      const q = parseFloat(qtyMap[it.contractItemId] ?? "0");
                      const value = isFinite(q) && q > 0 ? q * it.unitPrice : 0;
                      return (
                        <tr key={it.contractItemId} className="border-b border-white/5">
                          <td className="p-3 text-white">{it.description}</td>
                          <td className="p-3 text-slate-400">{it.unit}</td>
                          <td className="p-3 text-slate-300">{formatCurrency(it.unitPrice)}</td>
                          <td className="p-3 text-sky-400">{it.remainingQuantity}</td>
                          <td className="p-3">
                            <Input type="number" min={0} max={it.remainingQuantity} step="0.01"
                              value={qtyMap[it.contractItemId] ?? ""}
                              onChange={(ev) => updateQty(it.contractItemId, ev.target.value, it.remainingQuantity)}
                              className="!w-28" placeholder="0" />
                          </td>
                          <td className="p-3 text-money-default">{formatCurrency(value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-800/40 p-4">
            <span className="font-semibold text-white">إجمالي المستخلص (بدون ضريبة):</span>
            <span className="text-xl text-money-default">{formatCurrency(computedTotal)}</span>
          </div>

          <Field label="ملاحظات"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

          <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>إلغاء</Btn>
            <Btn type="submit" loading={saving}>إنشاء المستخلص</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المستخلص؟" loading={saving} />

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 glass-card border border-emerald-500/30 px-4 py-3 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:px-5">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <span className="text-white font-medium">{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white mr-2"><X className="h-4 w-4" /></button>
        </div>
      )}
    </AppShell>
    </RequireRole>
  );
}
