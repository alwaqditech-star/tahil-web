"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { moneyToneClass, spinnerClass } from "@/lib/theme";
import {
  Modal, Field, Input, Select, Textarea, FormActions, ConfirmDialog, Btn, NumberInput,
} from "@/components/crud/ui";
import { CatalogPicker } from "@/components/catalog-picker";
import { useAuth } from "@/contexts/auth-context";
import { api, type Contractor, type ContractItem, type Project, type CatalogItem } from "@/lib/api";
import { canCreate, canEdit, canDelete } from "@/lib/permissions";
import { formatCurrency, STATUS_LABELS, cn } from "@/lib/utils";
import {
  Loader2, Plus, ChevronDown, ChevronUp, Pencil, Trash2,
} from "lucide-react";

const emptyContractor = (): Partial<Contractor> => ({
  name: "", companyName: "", phone: "", email: "", specialty: "",
  licenseNumber: "", vatNumber: "", address: "", status: "active", notes: "",
});

const emptyItem = () => ({
  catalogItemId: "" as number | "",
  projectId: "", itemCode: "", description: "", unit: "",
  quantity: 1, unitPrice: 0, companyUnitCost: 0, status: "pending",
});

function itemStatusLabel(status: string) {
  if (status === "active") return "جاري التنفيذ";
  return STATUS_LABELS[status] ?? status;
}

function itemStatusVariant(status: string) {
  if (status === "completed") return statusVariant("completed");
  if (status === "active" || status === "in_progress") return statusVariant("in_progress");
  if (status === "cancelled") return statusVariant("cancelled");
  return statusVariant("pending");
}

function ContractItemsPanel({
  contractorId, token, role, onChanged,
}: {
  contractorId: number; token: string; role: string; onChanged: () => void;
}) {
  const [items, setItems] = useState<ContractItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemModal, setItemModal] = useState(false);
  const [form, setForm] = useState(emptyItem());
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(() => {
    setLoading(true);
    api.contractItems(token).list({ contractorId })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, contractorId]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    api.projects(token).list().then(setProjects).catch(() => {});
  }, [token]);

  const onAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.contractItems(token).create({
        contractorId,
        projectId: Number(form.projectId),
        catalogItemId: form.catalogItemId || undefined,
        itemCode: form.itemCode || null,
        description: form.description,
        unit: form.unit,
        quantity: form.quantity,
        unitPrice: form.unitPrice,
        companyUnitCost: form.companyUnitCost,
        status: form.status,
      });
      setItemModal(false);
      setForm(emptyItem());
      loadItems();
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white/3 border-t border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg">بنود العقد</h3>
        {canCreate(role, "contractors") && (
          <Btn variant="secondary" className="!text-xs" onClick={() => setItemModal(true)}>
            <Plus className="h-4 w-4" /> إضافة بند
          </Btn>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className={cn("h-6 w-6 animate-spin", spinnerClass)} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-slate-500 rounded-xl border border-white/10 bg-white/3">
          لا توجد بنود لهذا المقاول
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto bg-slate-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/5">
                <th className="text-right p-3">الكود</th>
                <th className="text-right p-3">الوصف</th>
                <th className="text-right p-3">المشروع</th>
                <th className="text-right p-3">الوحدة</th>
                <th className="text-right p-3">الكمية</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">الإجمالي</th>
                <th className="text-right p-3 min-w-[140px]">الإنجاز</th>
                <th className="text-right p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="p-3 font-mono text-xs text-sky-400">{item.itemCode ?? "—"}</td>
                  <td className="p-3 text-white">{item.description}</td>
                  <td className="p-3 text-slate-400">{item.projectName ?? "—"}</td>
                  <td className="p-3 text-slate-400">{item.unit}</td>
                  <td className="p-3 text-slate-300">{item.quantity}</td>
                  <td className="p-3 text-slate-300">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 text-money-default">{formatCurrency(item.totalValue)}</td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{item.progressPercent}%</span>
                        <span>{item.completedQuantity} / {item.quantity}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${item.progressPercent}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={itemStatusVariant(item.status)}>{itemStatusLabel(item.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="إضافة بند للمقاول" wide>
        <form onSubmit={onAddItem} className="space-y-4">
          <CatalogPicker
            token={token}
            value={form.catalogItemId}
            onChange={(item: CatalogItem | null) => {
              if (!item) {
                setForm((f) => ({ ...f, catalogItemId: "" }));
                return;
              }
              setForm({
                ...form,
                catalogItemId: item.id,
                itemCode: item.code ?? "",
                description: item.name,
                unit: item.unit,
                unitPrice: item.defaultUnitPrice,
                companyUnitCost: item.defaultEstimatedPrice,
              });
            }}
          />
          <Field label="المشروع" required>
            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              <option value="">اختر المشروع</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="كود البند"><Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} placeholder="C-001" /></Field>
            <Field label="الوحدة" required><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></Field>
            <Field label="الكمية" required><NumberInput step="0.01" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} required /></Field>
            <Field label="سعر الوحدة" required><NumberInput step="0.01" value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} required /></Field>
            <Field label="تكلفة الشركة (للربح)"><NumberInput step="0.01" value={form.companyUnitCost} onChange={(companyUnitCost) => setForm({ ...form, companyUnitCost })} /></Field>
            <Field label="الحالة">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">معلق</option>
                <option value="in_progress">جاري التنفيذ</option>
                <option value="completed">مكتمل</option>
              </Select>
            </Field>
          </div>
          <Field label="الوصف" required><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></Field>
          <FormActions onCancel={() => setItemModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

export default function ContractorsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Contractor>>(emptyContractor());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.contractors(token).list().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setForm(emptyContractor()); setError(null); setModal(true); };
  const openEdit = (c: Contractor) => { setEditId(c.id); setForm(c); setError(null); setModal(true); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    try {
      if (editId) await api.contractors(token).update(editId, form);
      else await api.contractors(token).create(form);
      setModal(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.contractors(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";

  return (
    <AppShell title="إدارة المقاولين">
      {canCreate(role, "contractors") && (
        <div className="mb-6 flex justify-end">
          <Btn onClick={openAdd}><Plus className="h-4 w-4" /> إضافة مقاول</Btn>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className={cn("h-8 w-8 animate-spin", spinnerClass)} /></div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">لا يوجد مقاولون</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/3">
                  <th className="w-10 p-3" />
                  <th className="text-right p-4 font-semibold">المقاول / الشركة</th>
                  <th className="text-right p-4 font-semibold">التخصص</th>
                  <th className="text-right p-4 font-semibold">الرقم الضريبي</th>
                  <th className="text-right p-4 font-semibold">قيمة العقود</th>
                  <th className="text-right p-4 font-semibold">المدفوع</th>
                  <th className="text-right p-4 font-semibold">الحالة</th>
                  <th className="text-right p-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className={`border-b border-white/5 hover:bg-white/3 transition-colors ${expanded === c.id ? "bg-white/5" : ""}`}
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          {expanded === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        {c.companyName && <div className="text-sm text-slate-400 mt-0.5">{c.companyName}</div>}
                      </td>
                      <td className="p-4 text-slate-300">{c.specialty ?? "—"}</td>
                      <td className="p-4 text-slate-400 font-mono text-xs">{c.vatNumber ?? "—"}</td>
                      <td className="p-4 font-bold text-white">{formatCurrency(c.totalContractValue ?? 0)}</td>
                      <td className="p-4 text-money-positive">{formatCurrency(c.totalPaid ?? 0)}</td>
                      <td className="p-4">
                        <Badge variant={statusVariant(c.status === "active" ? "active" : "inactive")}>
                          {c.status === "active" ? "نشط" : "غير نشط"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {canEdit(role, "contractors") && (
                            <button type="button" onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400" title="تعديل">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete(role) && (
                            <button type="button" onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400" title="حذف">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && token && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <ContractItemsPanel contractorId={c.id} token={token} role={role} onChanged={load} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل مقاول" : "إضافة مقاول جديد"} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم" required><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="اسم الشركة"><Input value={form.companyName ?? ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
            <Field label="التخصص"><Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
            <Field label="رقم الترخيص"><Input value={form.licenseNumber ?? ""} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></Field>
            <Field label="الرقم الضريبي"><Input value={form.vatNumber ?? ""} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></Field>
            <Field label="الهاتف"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="البريد"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="الحالة">
              <Select value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">نشط</option><option value="inactive">غير نشط</option>
              </Select>
            </Field>
          </div>
          <Field label="العنوان"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="ملاحظات"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المقاول؟" loading={saving} />
    </AppShell>
  );
}
