"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Btn, Field, Input, Select, Textarea, RowActions, PageToolbar, ConfirmDialog, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Project } from "@/lib/api";
import { canCreate, canEdit, canDelete, canViewFinancialData } from "@/lib/permissions";
import { RequireProjectsModule } from "@/components/require-projects-module";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const empty = (): Partial<Project> => ({
  name: "", client: "", description: "", location: "", status: "active",
  startDate: "", endDate: "", contractValue: 0, budgetAllocated: 0, progressPercent: 0,
});

export default function ProjectsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Project>>(empty());
  const [editId, setEditId] = useState<number | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.projects(token).list().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setForm(empty()); setFormStep(1); setError(null); setModal(true); };
  const openEdit = (p: Project) => {
    setEditId(p.id);
    setForm({ ...p, startDate: p.startDate ?? "", endDate: p.endDate ?? "" });
    setFormStep(1); setError(null); setModal(true);
  };

  const saveProject = async () => {
    if (!token) return;
    if (!editId && formStep < 3) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name, client: form.client, description: form.description,
        location: form.location, status: form.status, startDate: form.startDate || null,
        endDate: form.endDate || null, contractValue: Number(form.contractValue),
        budgetAllocated: Number(form.budgetAllocated), progressPercent: Number(form.progressPercent),
      };
      if (editId) await api.projects(token).update(editId, body);
      else await api.projects(token).create(body);
      setModal(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (formStep === 1 && (!form.name?.trim() || !form.client?.trim())) {
      setError("اسم المشروع والعميل مطلوبان");
      return;
    }
    setError(null);
    window.setTimeout(() => setFormStep((s) => s + 1), 0);
  };

  const goBack = () => {
    if (editId) {
      setModal(false);
      return;
    }
    if (formStep > 1) setFormStep((s) => s - 1);
    else setModal(false);
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.projects(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";
  const showFinancial = canViewFinancialData(role);

  return (
    <RequireProjectsModule>
    <AppShell title="إدارة المشاريع">
      <PageToolbar onAdd={canCreate(role, "projects") ? openAdd : undefined} addLabel="مشروع جديد" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="glass-card p-6 group">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(p.status)}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  {(canEdit(role, "projects") || canDelete(role)) && (
                    <RowActions onEdit={canEdit(role, "projects") ? () => openEdit(p) : undefined} onDelete={canDelete(role) ? () => setDeleteId(p.id) : undefined} />
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-1">{p.client}</p>
              {p.location && <p className="text-xs text-slate-500 mb-4">{p.location}</p>}
              <div className="progress-bar mb-2"><div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} /></div>
              <p className="text-xs text-slate-500 mb-4">إنجاز {p.progressPercent}%</p>
              {showFinancial ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-white/3">
                    <p className="text-slate-500 text-xs">قيمة العقد</p>
                    <p className="text-money-default">{formatCurrency(p.contractValue)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/3">
                    <p className="text-slate-500 text-xs">المصروفات</p>
                    <p className="font-bold text-rose-400">{formatCurrency(p.totalExpenses)}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white/3 text-sm">
                  <p className="text-slate-500 text-xs">حالة المشروع</p>
                  <p className="text-slate-300">متابعة الإنجاز والبنود فقط</p>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                <div className="text-slate-500">
                  <span>البداية: {formatDate(p.startDate)}</span>
                  <span className="mx-2">|</span>
                  <span>النهاية: {formatDate(p.endDate)}</span>
                </div>
                <Link href={`/projects/${p.id}`} className="erp-link font-medium">البنود والتفاصيل ←</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل مشروع" : "إضافة مشروع"} wide>
        <div className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          {!editId && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              {["البيانات الأساسية", "المالية والجدول", "الوصف"].map((label, i) => (
                <span key={label} className={`rounded-full px-3 py-1 ${formStep === i + 1 ? "bg-[var(--brand)] text-white" : "bg-white/5 text-slate-400"}`}>
                  {i + 1}. {label}
                </span>
              ))}
            </div>
          )}
          {(editId || formStep === 1) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="اسم المشروع" required><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="العميل" required><Input value={form.client ?? ""} onChange={(e) => setForm({ ...form, client: e.target.value })} /></Field>
              <Field label="الموقع / المدينة"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="مثال: الرياض — حي النرجس" /></Field>
              <Field label="الحالة">
                <Select value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">نشط</option><option value="completed">مكتمل</option><option value="on_hold">متوقف</option>
                </Select>
              </Field>
            </div>
          )}
          {(editId || formStep === 2) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="تاريخ البداية"><Input type="date" value={form.startDate ?? ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="تاريخ النهاية"><Input type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
              <Field label="قيمة العقد"><NumberInput value={form.contractValue ?? 0} onChange={(contractValue) => setForm({ ...form, contractValue })} /></Field>
              <Field label="الميزانية"><NumberInput value={form.budgetAllocated ?? 0} onChange={(budgetAllocated) => setForm({ ...form, budgetAllocated })} /></Field>
              <Field label="نسبة الإنجاز %"><NumberInput min={0} max={100} value={form.progressPercent ?? 0} onChange={(progressPercent) => setForm({ ...form, progressPercent })} /></Field>
            </div>
          )}
          {(editId || formStep === 3) && (
            <Field label="وصف المشروع / ملاحظات الفريق">
              <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل إضافية، فريق العمل، ملاحظات..." />
            </Field>
          )}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-4">
            <Btn variant="ghost" type="button" onClick={goBack}>
              {editId ? "إلغاء" : formStep > 1 ? "السابق" : "إلغاء"}
            </Btn>
            {!editId && formStep < 3 && (
              <Btn type="button" onClick={goNext}>التالي</Btn>
            )}
            {(editId || formStep === 3) && (
              <Btn type="button" onClick={saveProject} loading={saving}>حفظ</Btn>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المشروع؟" loading={saving} />
    </AppShell>
    </RequireProjectsModule>
  );
}
