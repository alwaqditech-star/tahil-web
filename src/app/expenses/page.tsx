"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, FormActions, RowActions, PageToolbar, ConfirmDialog, Btn, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, uploadsUrl, type Expense, type ProjectPickerOption, type ExpenseCategory, type ContractItem } from "@/lib/api";
import { canCreate, canEdit, canDelete, canManagerApproveExpense, canAccountantApproveExpense } from "@/lib/permissions";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function ExpensesPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<ProjectPickerOption[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    projectId: 0, title: "", amount: 0, category: "", expenseDate: new Date().toISOString().slice(0, 10),
    attachmentUrl: "", description: "", isGeneral: false, contractorId: 0, projectItemId: 0,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [exp, proj, cats] = await Promise.all([
        api.expenses(token).list(), api.projects(token).picker(), api.expenseCategories(token),
      ]);
      setRows(exp); setProjects(proj); setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || !form.projectId || form.isGeneral) { setContractItems([]); return; }
    api.contractItems(token).list({ projectId: form.projectId }).then(setContractItems).catch(() => {});
  }, [token, form.projectId, form.isGeneral]);

  const projectContractors = [...new Map(
    contractItems.map((i) => [i.contractorId, { id: i.contractorId, name: i.contractorName ?? `مقاول #${i.contractorId}` }])
  ).values()];

  const contractorItems = contractItems.filter((i) => i.contractorId === form.contractorId);

  const openAdd = () => {
    const defaultProject = user?.assignedProjectId ?? projects[0]?.id ?? 0;
    setEditId(null);
    setForm({
      projectId: defaultProject,
      title: "", amount: 0, category: categories[0]?.name ?? "",
      expenseDate: new Date().toISOString().slice(0, 10),
      attachmentUrl: "", description: "", isGeneral: false, contractorId: 0, projectItemId: 0,
    });
    setError(null); setModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditId(e.id);
    setForm({
      projectId: e.projectId, title: e.title, amount: e.amount, category: e.category,
      expenseDate: e.expenseDate, attachmentUrl: e.attachmentUrl ?? "", description: e.description ?? "",
      isGeneral: e.type === "general", contractorId: e.contractorId ?? 0, projectItemId: e.projectItemId ?? 0,
    });
    setError(null); setModal(true);
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    const body = {
      projectId: form.projectId,
      title: form.title,
      amount: form.amount,
      category: form.category,
      expenseDate: form.expenseDate,
      attachmentUrl: form.attachmentUrl,
      description: form.description,
      type: form.isGeneral ? "general" : "expense",
      contractorId: form.isGeneral ? null : (form.contractorId || null),
      projectItemId: form.isGeneral || !form.projectItemId ? null : form.projectItemId,
    };
    try {
      if (editId) await api.expenses(token).update(editId, body);
      else await api.expenses(token).create(body);
      setModal(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const approve = async (id: number, action: string) => {
    if (!token) return;
    try { await api.expenses(token).patch(id, { action }); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const r = await api.upload(token, file);
      setForm((f) => ({ ...f, attachmentUrl: r.url }));
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.expenses(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";
  const isSupervisor = role === "site_supervisor";

  return (
    <AppShell title="إدارة المصروفات">
      <PageToolbar onAdd={canCreate(role, "expenses") ? openAdd : undefined} addLabel="مصروف جديد" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right p-4">العنوان</th>
                  <th className="text-right p-4">المشروع</th>
                  <th className="text-right p-4">النوع</th>
                  <th className="text-right p-4">الفئة</th>
                  <th className="text-right p-4">المبلغ</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">التاريخ</th>
                  <th className="text-right p-4">مرفق</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="p-4 text-white font-medium">{e.title}</td>
                    <td className="p-4 text-slate-400">{e.projectName}</td>
                    <td className="p-4 text-xs">{e.type === "general" ? "عام" : "مرتبط ببند"}</td>
                    <td className="p-4 text-slate-300">{e.category}</td>
                    <td className="p-4 text-money-negative">{formatCurrency(e.amount)}</td>
                    <td className="p-4"><Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge></td>
                    <td className="p-4 text-slate-500">{formatDate(e.expenseDate)}</td>
                    <td className="p-4">
                      {e.attachmentUrl ? (
                        <a href={uploadsUrl(e.attachmentUrl)} target="_blank" rel="noreferrer" className="erp-link text-xs">عرض</a>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      <RowActions
                        showApprove={canManagerApproveExpense(role) && e.status === "pending"}
                        onApprove={() => approve(e.id, "manager_approve")}
                        onReject={() => approve(e.id, "reject")}
                        onEdit={canEdit(role, "expenses") ? () => openEdit(e) : undefined}
                        onDelete={canDelete(role) ? () => setDeleteId(e.id) : undefined}
                      />
                      {canAccountantApproveExpense(role) && e.status === "manager_approved" && (
                        <Btn variant="success" onClick={() => approve(e.id, "accountant_approve")} className="!px-2 !py-1 text-xs mr-1">اعتماد محاسب</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل مصروف" : "إضافة مصروف"} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <Field label="المشروع" required>
            <Select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: Number(e.target.value), contractorId: 0, projectItemId: 0 })}
              required
              disabled={isSupervisor}
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isGeneral}
              onChange={(e) => setForm({ ...form, isGeneral: e.target.checked, contractorId: 0, projectItemId: 0 })}
              className="rounded"
            />
            مصروف عام للمشروع (كهرباء، ماء، إيجار، ضيافة...)
          </label>

          {!form.isGeneral && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
              <Field label="المقاول">
                <Select
                  value={form.contractorId}
                  onChange={(e) => setForm({ ...form, contractorId: Number(e.target.value), projectItemId: 0 })}
                >
                  <option value={0}>— اختر المقاول —</option>
                  {projectContractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="البند المرتبط">
                <Select
                  value={form.projectItemId}
                  onChange={(e) => setForm({ ...form, projectItemId: Number(e.target.value) })}
                  disabled={!form.contractorId}
                >
                  <option value={0}>— اختر البند —</option>
                  {contractorItems.map((i) => (
                    <option key={i.id} value={i.projectItemId ?? i.id}>{i.description}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <Field label="العنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الفئة" required>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="المبلغ" required><NumberInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required /></Field>
          </div>
          <Field label="التاريخ" required><Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required /></Field>
          <Field label="الوصف"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="مرفق (فاتورة/صورة)">
            <input type="file" accept="image/*,.pdf" onChange={onUpload} className="text-sm text-slate-400" />
            {form.attachmentUrl && <p className="text-xs text-emerald-400 mt-1">تم رفع المرفق ✓</p>}
          </Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المصروف؟" loading={saving} />
    </AppShell>
  );
}
