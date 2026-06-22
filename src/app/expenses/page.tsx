"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, FormActions, RowActions, ConfirmDialog, Btn, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, fetchAttachmentBlobUrl, type Expense, type ProjectPickerOption, type ExpenseCategory, type ContractItem } from "@/lib/api";
import { canCreate, canEdit, canDelete, canManagerApproveExpense, canAccountantApproveExpense, canPrintExpensePdf, isFieldRole, canViewFinancialData } from "@/lib/permissions";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { printExpensePdf, printAllExpensesPdf } from "@/lib/expense-pdf";
import { Loader2, Printer, Eye } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewBusyRef = useRef(false);

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
      title: "", amount: 0, category: "",
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
    if (form.isGeneral && !form.category) {
      setError("اختر الفئة للمصروف العام");
      setSaving(false);
      return;
    }
    const body = {
      projectId: form.projectId,
      title: form.title,
      amount: form.amount,
      category: form.isGeneral ? form.category : "مرتبط ببند",
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
    const messages: Record<string, string> = {
      manager_approve: "هل أنت متأكد من اعتماد هذا المصروف؟",
      accountant_approve: "هل أنت متأكد من الاعتماد النهائي للمصروف؟",
      reject: "هل أنت متأكد من رفض هذا المصروف؟",
    };
    if (messages[action] && !confirm(messages[action])) return;
    try { await api.expenses(token).patch(id, { action }); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      const r = await api.upload(token, file);
      setForm((f) => ({ ...f, attachmentUrl: r.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const closePreview = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewIsPdf(false);
    setPreviewOpen(false);
    setPreviewLoading(false);
    previewBusyRef.current = false;
  };

  const openPreview = async (attachmentUrl: string) => {
    if (!token || previewBusyRef.current) return;
    previewBusyRef.current = true;
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewIsPdf(false);
    try {
      const { url, mimeType } = await fetchAttachmentBlobUrl(attachmentUrl, token);
      setPreviewIsPdf(
        mimeType.includes("pdf")
        || attachmentUrl.toLowerCase().endsWith(".pdf"),
      );
      setPreviewUrl(url);
    } catch (err) {
      closePreview();
      alert(err instanceof Error ? err.message : "تعذر عرض المرفق");
      return;
    } finally {
      setPreviewLoading(false);
      previewBusyRef.current = false;
    }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.expenses(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";
  const isFieldUser = isFieldRole(role);
  const showFinancial = canViewFinancialData(role);

  return (
    <AppShell title="إدارة المصروفات">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {canCreate(role, "expenses") && (
          <Btn onClick={openAdd}>+ مصروف جديد</Btn>
        )}
        {canPrintExpensePdf(role) && rows.length > 0 && (
          <Btn variant="secondary" onClick={() => printAllExpensesPdf(rows, token)}>
            <Printer className="h-4 w-4" /> طباعة PDF (الكل)
          </Btn>
        )}
      </div>
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
                  {showFinancial && <th className="text-right p-4">المبلغ</th>}
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
                    <td className="p-4 text-slate-300">{e.type === "general" ? e.category : "—"}</td>
                    {showFinancial && <td className="p-4 text-money-negative">{formatCurrency(e.amount)}</td>}
                    <td className="p-4"><Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status] ?? e.status}</Badge></td>
                    <td className="p-4 text-slate-500">{formatDate(e.expenseDate)}</td>
                    <td className="p-4">
                      {e.attachmentUrl ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPreview(e.attachmentUrl!)}
                            disabled={previewLoading || previewOpen}
                            className="erp-link text-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            {previewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            معاينة
                          </button>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1">
                      {canPrintExpensePdf(role) && (
                        <Btn variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => printExpensePdf(e, token)}>
                          <Printer className="h-3 w-3" /> PDF
                        </Btn>
                      )}
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
                      </div>
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
              disabled={isFieldUser}
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isGeneral}
              onChange={(e) => {
                const isGeneral = e.target.checked;
                setForm({
                  ...form,
                  isGeneral,
                  contractorId: 0,
                  projectItemId: 0,
                  category: isGeneral ? (form.category || categories[0]?.name || "") : "",
                });
              }}
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
          <div className={form.isGeneral ? "grid grid-cols-2 gap-4" : ""}>
            {form.isGeneral && (
              <Field label="الفئة" required>
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">— اختر الفئة —</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="المبلغ" required><NumberInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required /></Field>
          </div>
          <Field label="التاريخ" required><Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required /></Field>
          <Field label="الوصف"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="مرفق (فاتورة / سند صرف)">
            <input type="file" accept="image/*,.pdf" onChange={onUpload} disabled={uploading} className="text-sm text-slate-400" />
            {uploading && <p className="mt-2 text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع...</p>}
            {form.attachmentUrl && (
              <div className="mt-2 flex gap-2">
                <p className="text-xs text-emerald-400">تم رفع المرفق ✓</p>
                <button
                  type="button"
                  className="erp-link text-xs disabled:opacity-40 disabled:pointer-events-none"
                  onClick={() => openPreview(form.attachmentUrl)}
                  disabled={previewLoading || previewOpen}
                >
                  {previewLoading ? "جاري الجلب..." : "معاينة"}
                </button>
              </div>
            )}
          </Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المصروف؟" loading={saving} />

      <Modal open={previewOpen} onClose={closePreview} title="معاينة المرفق" wide>
        {previewLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-10 w-10 animate-spin spinner-brand" />
            <p className="text-sm text-slate-400">جاري جلب المرفق...</p>
            <p className="text-xs text-slate-500">يرجى الانتظار ولا تغلق النافذة</p>
          </div>
        ) : previewUrl ? (
          previewIsPdf ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  className="erp-link text-xs"
                  onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                >
                  فتح PDF في تبويب جديد
                </button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] rounded-lg border border-white/10 bg-white"
                title="مرفق PDF"
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="مرفق" className="max-h-[70vh] mx-auto rounded-lg" />
          )
        ) : null}
      </Modal>
    </AppShell>
  );
}
