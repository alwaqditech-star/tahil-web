"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Modal, Btn, Field, Input, FormActions, RowActions, PageToolbar, ConfirmDialog, NumberInput } from "@/components/crud/ui";
import { CatalogPicker } from "@/components/catalog-picker";
import { useAuth } from "@/contexts/auth-context";
import { api, type Project, type ProjectItem, type CatalogItem } from "@/lib/api";
import { canCreate, canEdit, canDelete, canViewFinancialData } from "@/lib/permissions";
import { RequireProjectsModule } from "@/components/require-projects-module";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Upload, ArrowRight } from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { token, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ catalogItemId: "" as number | "", name: "", unit: "", unitPrice: 0, estimatedPrice: 0, executedPrice: 0, quantity: 1 });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, it] = await Promise.all([
        api.projects(token).get(projectId),
        api.projectItems(token, projectId).list(),
      ]);
      setProject(p); setItems(it);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, projectId]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      if (editId) await api.projectItems(token, projectId).update(editId, { ...form, catalogItemId: form.catalogItemId || undefined });
      else await api.projectItems(token, projectId).create({ ...form, projectId, catalogItemId: form.catalogItemId || undefined });
      setModal(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const r = await api.projectItems(token, projectId).importExcel(file);
      alert(`تم استيراد ${r.inserted} بند`);
      load();
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const role = user?.role ?? "";
  const showFinancial = canViewFinancialData(role);
  const totalEst = items.reduce((s, i) => s + i.totalEstimated, 0);
  const totalExec = items.reduce((s, i) => s + i.totalExecuted, 0);

  if (loading) return (
    <RequireProjectsModule>
      <AppShell title="تفاصيل المشروع"><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div></AppShell>
    </RequireProjectsModule>
  );

  return (
    <RequireProjectsModule>
    <AppShell title={project?.name ?? "تفاصيل المشروع"}>
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 mb-6">
        <ArrowRight className="h-4 w-4" /> العودة للمشاريع
      </Link>

      {project && (
        <div className={`glass-card p-6 mb-6 grid gap-4 ${showFinancial ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
          <div><p className="text-xs text-slate-500">العميل</p><p className="text-white font-semibold">{project.client}</p></div>
          {showFinancial && (
            <>
              <div><p className="text-xs text-slate-500">قيمة العقد</p><p className="text-money-default">{formatCurrency(project.contractValue)}</p></div>
              <div><p className="text-xs text-slate-500">إجمالي تقديري</p><p className="text-money-muted">{formatCurrency(totalEst)}</p></div>
              <div><p className="text-xs text-slate-500">إجمالي منفذ</p><p className="text-money-default">{formatCurrency(totalExec)}</p></div>
            </>
          )}
          {!showFinancial && (
            <div><p className="text-xs text-slate-500">نسبة الإنجاز</p><p className="text-white font-semibold">{project.progressPercent}%</p></div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">بنود المشروع (BOQ)</h3>
        <div className="flex gap-2">
          {canCreate(role, "projectItems") && (
            <>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  <Upload className="h-4 w-4" /> استيراد Excel
                </span>
              </label>
              <Btn onClick={() => { setEditId(null); setForm({ catalogItemId: "", name: "", unit: "", unitPrice: 0, estimatedPrice: 0, executedPrice: 0, quantity: 1 }); setModal(true); }}>+ بند جديد</Btn>
            </>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="text-right p-4">البند</th>
              <th className="text-right p-4">الوحدة</th>
              <th className="text-right p-4">الكمية</th>
              {showFinancial && (
                <>
                  <th className="text-right p-4">سعر البند</th>
                  <th className="text-right p-4">التقديري</th>
                  <th className="text-right p-4">المنفذ</th>
                  <th className="text-right p-4">الفرق</th>
                </>
              )}
              <th className="text-right p-4">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-white/5 hover:bg-white/3">
                <td className="p-4 text-white">{i.name}</td>
                <td className="p-4 text-slate-400">{i.unit}</td>
                <td className="p-4">{i.quantity}</td>
                {showFinancial && (
                  <>
                    <td className="p-4">{formatCurrency(i.unitPrice)}</td>
                    <td className="p-4 text-money-muted">{formatCurrency(i.totalEstimated)}</td>
                    <td className="p-4 text-money-default">{formatCurrency(i.totalExecuted)}</td>
                    <td className={`p-4 ${i.variance >= 0 ? "text-money-positive" : "text-money-negative"}`}>{formatCurrency(i.variance)}</td>
                  </>
                )}
                <td className="p-4">
                  <RowActions
                    onEdit={canEdit(role, "projectItems") ? () => { setEditId(i.id); setForm({ catalogItemId: i.catalogItemId ?? "", name: i.name, unit: i.unit, unitPrice: i.unitPrice, estimatedPrice: i.estimatedPrice, executedPrice: i.executedPrice, quantity: i.quantity }); setModal(true); } : undefined}
                    onDelete={canDelete(role) ? () => setDeleteId(i.id) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل بند" : "إضافة بند"} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {!editId && token && (
            <CatalogPicker
              token={token}
              value={form.catalogItemId}
              onChange={(item: CatalogItem | null) => {
                if (!item) {
                  setForm((f) => ({ ...f, catalogItemId: "" }));
                  return;
                }
                setForm({
                  catalogItemId: item.id,
                  name: item.name,
                  unit: item.unit,
                  unitPrice: item.defaultUnitPrice,
                  estimatedPrice: item.defaultEstimatedPrice,
                  executedPrice: 0,
                  quantity: 1,
                });
              }}
            />
          )}
          <Field label="اسم البند" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الوحدة"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="الكمية"><NumberInput value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} /></Field>
            <Field label="سعر البند"><NumberInput value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} /></Field>
            <Field label="السعر التقديري"><NumberInput value={form.estimatedPrice} onChange={(estimatedPrice) => setForm({ ...form, estimatedPrice })} /></Field>
            <Field label="السعر المنفذ"><NumberInput value={form.executedPrice} onChange={(executedPrice) => setForm({ ...form, executedPrice })} /></Field>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => {
        if (!token || !deleteId) return;
        await api.projectItems(token, projectId).remove(deleteId);
        setDeleteId(null); load();
      }} message="حذف هذا البند؟" />
    </AppShell>
    </RequireProjectsModule>
  );
}
