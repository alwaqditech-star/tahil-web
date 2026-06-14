"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, FormActions, RowActions, PageToolbar, ConfirmDialog, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Purchase, type Project, type Supplier } from "@/lib/api";
import { canCreate, canEdit, canDelete } from "@/lib/permissions";
import { formatCurrency, STATUS_LABELS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function PurchasesPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ supplierId: 0, projectId: 0, purchaseNumber: "", title: "", amount: 0, paidAmount: 0, status: "draft", paymentStatus: "unpaid", orderDate: new Date().toISOString().slice(0, 10) });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pur, proj, sup] = await Promise.all([api.purchases(token).list(), api.projects(token).list(), api.suppliers(token).list()]);
      setRows(pur); setProjects(proj); setSuppliers(sup);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setForm({ supplierId: suppliers[0]?.id ?? 0, projectId: projects[0]?.id ?? 0, purchaseNumber: `PO-${Date.now()}`, title: "", amount: 0, paidAmount: 0, status: "draft", paymentStatus: "unpaid", orderDate: new Date().toISOString().slice(0, 10) });
    setError(null); setModal(true);
  };
  const openEdit = (p: Purchase) => {
    setEditId(p.id);
    setForm({ supplierId: p.supplierId, projectId: p.projectId, purchaseNumber: p.purchaseNumber, title: p.title, amount: p.amount, paidAmount: p.paidAmount, status: p.status, paymentStatus: p.paymentStatus, orderDate: p.orderDate });
    setError(null); setModal(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    try {
      if (editId) await api.purchases(token).update(editId, form);
      else await api.purchases(token).create(form);
      setModal(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.purchases(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";

  return (
    <AppShell title="مشتريات الموردين">
      <PageToolbar onAdd={canCreate(role, "purchases") ? openAdd : undefined} addLabel="طلب شراء جديد" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right p-4">رقم الطلب</th>
                  <th className="text-right p-4">العنوان</th>
                  <th className="text-right p-4">المورد</th>
                  <th className="text-right p-4">المبلغ</th>
                  <th className="text-right p-4">الدفع</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="p-4 text-sky-400 font-mono text-xs">{p.purchaseNumber}</td>
                    <td className="p-4 text-white font-medium">{p.title}</td>
                    <td className="p-4 text-slate-400">{p.supplierName}</td>
                    <td className="p-4 text-money-negative font-bold">{formatCurrency(p.amount)}</td>
                    <td className="p-4"><Badge variant={statusVariant(p.paymentStatus)}>{STATUS_LABELS[p.paymentStatus] ?? p.paymentStatus}</Badge></td>
                    <td className="p-4"><Badge variant={statusVariant(p.status)}>{STATUS_LABELS[p.status] ?? p.status}</Badge></td>
                    <td className="p-4">
                      <RowActions onEdit={canEdit(role, "purchases") ? () => openEdit(p) : undefined} onDelete={canDelete(role) ? () => setDeleteId(p.id) : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل طلب شراء" : "إضافة طلب شراء"} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم الطلب" required><Input value={form.purchaseNumber} onChange={(e) => setForm({ ...form, purchaseNumber: e.target.value })} required /></Field>
            <Field label="العنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label="المورد" required>
              <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: Number(e.target.value) })}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="المشروع" required>
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: Number(e.target.value) })}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="المبلغ"><NumberInput value={form.amount ?? 0} onChange={(amount) => setForm({ ...form, amount })} /></Field>
            <Field label="المدفوع"><NumberInput value={form.paidAmount ?? 0} onChange={(paidAmount) => setForm({ ...form, paidAmount })} /></Field>
            <Field label="حالة الطلب">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">مسودة</option><option value="ordered">مطلوب</option><option value="received">مُستلم</option>
              </Select>
            </Field>
            <Field label="حالة الدفع">
              <Select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="unpaid">غير مدفوع</option><option value="partial">جزئي</option><option value="paid">مدفوع</option>
              </Select>
            </Field>
            <Field label="تاريخ الطلب"><Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} /></Field>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا الطلب؟" loading={saving} />
    </AppShell>
  );
}
