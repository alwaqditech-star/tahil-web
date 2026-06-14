"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import {
  Modal, Field, Input, Select, Textarea, FormActions, RowActions,
  PageToolbar, ConfirmDialog, NumberInput,
} from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type CatalogItem } from "@/lib/api";
import { canCreate, canEdit, canDelete } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";

const empty = (): Partial<CatalogItem> => ({
  code: "", name: "", unit: "", defaultUnitPrice: 0, defaultEstimatedPrice: 0,
  category: "", isActive: true, notes: "",
});

export default function CatalogItemsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<CatalogItem>>(empty());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.catalogItems(token).list().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const role = user?.role ?? "";
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.code?.toLowerCase().includes(q)) ||
      (r.category?.toLowerCase().includes(q)) ||
      r.unit.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <AppShell title="دليل البنود">
      <p className="text-slate-400 text-sm mb-4">
        أدخل البنود هنا مرة واحدة، ثم استدعِها عند إضافة بنود للمشاريع أو المقاولين أو العقود.
      </p>

      <PageToolbar
        onAdd={canCreate(role, "catalogItems") ? () => { setEditId(null); setForm(empty()); setModal(true); } : undefined}
        addLabel="بند جديد"
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالكود أو الاسم أو الفئة..."
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          {rows.length === 0 ? "لا توجد بنود — ابدأ بإضافة بند جديد" : "لا توجد نتائج للبحث"}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/3">
                <th className="text-right p-4">الكود</th>
                <th className="text-right p-4">البند</th>
                <th className="text-right p-4">الفئة</th>
                <th className="text-right p-4">الوحدة</th>
                <th className="text-right p-4">السعر الافتراضي</th>
                <th className="text-right p-4">التقديري</th>
                <th className="text-right p-4">الحالة</th>
                <th className="text-right p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="p-4 font-mono text-sky-400 text-xs">{item.code ?? "—"}</td>
                  <td className="p-4 text-white font-medium">{item.name}</td>
                  <td className="p-4">{item.category ? <Badge variant="info">{item.category}</Badge> : "—"}</td>
                  <td className="p-4 text-slate-400">{item.unit || "—"}</td>
                  <td className="p-4 text-slate-300">{formatCurrency(item.defaultUnitPrice)}</td>
                  <td className="p-4 text-money-default">{formatCurrency(item.defaultEstimatedPrice)}</td>
                  <td className="p-4">
                    <Badge variant={item.isActive ? statusVariant("active") : statusVariant("inactive")}>
                      {item.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <RowActions
                      onEdit={canEdit(role, "catalogItems") ? () => { setEditId(item.id); setForm(item); setModal(true); } : undefined}
                      onDelete={canDelete(role) ? () => setDeleteId(item.id) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل بند" : "إضافة بند للدليل"} wide>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!token) return;
          setSaving(true);
          try {
            if (editId) await api.catalogItems(token).update(editId, form);
            else await api.catalogItems(token).create(form);
            setModal(false); load();
          } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="كود البند"><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="C-001" /></Field>
            <Field label="الفئة"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="خرسانة، كهرباء..." /></Field>
            <Field label="اسم البند" required><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="الوحدة"><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="م³، م²، طن..." /></Field>
            <Field label="السعر الافتراضي"><NumberInput step="0.01" value={form.defaultUnitPrice ?? 0} onChange={(defaultUnitPrice) => setForm({ ...form, defaultUnitPrice })} /></Field>
            <Field label="السعر التقديري"><NumberInput step="0.01" value={form.defaultEstimatedPrice ?? 0} onChange={(defaultEstimatedPrice) => setForm({ ...form, defaultEstimatedPrice })} /></Field>
            <Field label="الحالة">
              <Select value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}>
                <option value="active">نشط</option>
                <option value="inactive">موقوف</option>
              </Select>
            </Field>
          </div>
          <Field label="ملاحظات"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => {
        if (!token || !deleteId) return;
        await api.catalogItems(token).remove(deleteId);
        setDeleteId(null); load();
      }} message="حذف هذا البند من الدليل؟ لن يؤثر على البنود المضافة مسبقاً للمشاريع." />
    </AppShell>
  );
}
