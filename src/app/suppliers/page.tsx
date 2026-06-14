"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, Textarea, FormActions, RowActions, PageToolbar, ConfirmDialog } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Supplier } from "@/lib/api";
import { canCreate, canEdit, canDelete } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

const empty = (): Partial<Supplier> => ({ name: "", companyName: "", phone: "", category: "", status: "active" });

export default function SuppliersPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(empty());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.suppliers(token).list().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const role = user?.role ?? "";

  return (
    <AppShell title="إدارة الموردين">
      <PageToolbar onAdd={canCreate(role, "suppliers") ? () => { setEditId(null); setForm(empty()); setModal(true); } : undefined} addLabel="مورد جديد" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className="glass-card p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-white text-lg">{s.name}</h3>
                <RowActions onEdit={canEdit(role, "suppliers") ? () => { setEditId(s.id); setForm(s); setModal(true); } : undefined} onDelete={canDelete(role) ? () => setDeleteId(s.id) : undefined} />
              </div>
              {s.companyName && <p className="text-sm text-slate-400">{s.companyName}</p>}
              {s.category && <Badge variant="info" className="mt-2">{s.category}</Badge>}
              {s.phone && <p className="text-sm text-slate-500 mt-3">{s.phone}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل مورد" : "إضافة مورد"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!token) return;
          setSaving(true);
          try {
            if (editId) await api.suppliers(token).update(editId, form);
            else await api.suppliers(token).create(form);
            setModal(false); load();
          } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <Field label="الاسم" required><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="الشركة"><Input value={form.companyName ?? ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          <Field label="الفئة"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="الهاتف"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => {
        if (!token || !deleteId) return;
        await api.suppliers(token).remove(deleteId);
        setDeleteId(null); load();
      }} message="حذف هذا المورد؟" />
    </AppShell>
  );
}
