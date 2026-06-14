"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, Textarea, FormActions, ConfirmDialog, Btn, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type PettyCash, type Project } from "@/lib/api";
import { canCreate, canDelete, canSettlePettyCash, canUsePettyCash } from "@/lib/permissions";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type AssignableUser = { id: number; name: string; role: string };

export default function PettyCashPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<PettyCash[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignable, setAssignable] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [useModal, setUseModal] = useState<PettyCash | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    projectId: "", assignedToId: "", purpose: "", allocatedAmount: 0,
    issuedDate: new Date().toISOString().slice(0, 10), notes: "",
  });
  const [useAmount, setUseAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pc, proj] = await Promise.all([api.pettyCash(token).list(), api.projects(token).list()]);
      setRows(pc); setProjects(proj);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || !canCreate(user?.role ?? "", "pettyCash")) return;
    api.assignableUsers(token).then((list) =>
      setAssignable(list.filter((u) => ["project_manager", "site_supervisor"].includes(u.role)))
    ).catch(() => {});
  }, [token, user]);

  const openAdd = () => {
    setForm({
      projectId: projects[0]?.id ? String(projects[0].id) : "",
      assignedToId: assignable[0]?.id ? String(assignable[0].id) : "",
      purpose: "", allocatedAmount: 0,
      issuedDate: new Date().toISOString().slice(0, 10), notes: "",
    });
    setError(null); setModal(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    try {
      await api.pettyCash(token).create({
        projectId: form.projectId ? Number(form.projectId) : null,
        assignedToId: Number(form.assignedToId),
        purpose: form.purpose,
        allocatedAmount: form.allocatedAmount,
        issuedDate: form.issuedDate,
        notes: form.notes,
      });
      setModal(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const onUse = async () => {
    if (!token || !useModal) return;
    setSaving(true);
    try {
      await api.pettyCash(token).use(useModal.id, useAmount, useModal.projectId ?? undefined);
      setUseModal(null); setUseAmount(0); load();
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const onSettle = async (r: PettyCash) => {
    if (!token) return;
    if (!confirm(`تسوية عهدة "${r.purpose}" بمبلغ ${formatCurrency(r.usedAmount)}؟`)) return;
    try {
      await api.pettyCash(token).settle(r.id, r.usedAmount);
      load();
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try { await api.pettyCash(token).remove(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const role = user?.role ?? "";

  return (
    <AppShell title="إدارة العهد">
      {canCreate(role, "pettyCash") && (
        <div className="mb-6 flex justify-end">
          <Btn onClick={openAdd}>+ عهدة جديدة</Btn>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map((r) => {
            const remaining = r.remaining ?? r.allocatedAmount - r.usedAmount;
            const isMine = r.assignedToId === user?.id;
            return (
              <div key={r.id} className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white">{r.purpose}</h3>
                    <p className="text-sm text-slate-400 mt-1">{r.assignedTo} — {r.projectName ?? "بدون مشروع"}</p>
                  </div>
                  <Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-white/5">
                    <p className="text-xs text-slate-500">المخصص</p>
                    <p className="text-money-default">{formatCurrency(r.allocatedAmount)}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-rose-500/10">
                    <p className="text-xs text-slate-500">المستخدم</p>
                    <p className="font-bold text-rose-400">{formatCurrency(r.usedAmount)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-slate-500">المتبقي</p>
                    <p className={remaining > 0 ? "text-amber-400 font-semibold" : "text-money-positive"}>{formatCurrency(remaining)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">تاريخ الإصدار: {formatDate(r.issuedDate)}</p>
                <div className="flex gap-2 flex-wrap">
                  {r.status === "open" && canUsePettyCash(role) && (isMine || role === "admin") && (
                    <Btn variant="secondary" className="!text-xs" onClick={() => { setUseModal(r); setUseAmount(0); }}>صرف من العهدة</Btn>
                  )}
                  {r.status === "open" && canSettlePettyCash(role) && (
                    <Btn variant="success" className="!text-xs" onClick={() => onSettle(r)}>تسوية</Btn>
                  )}
                  {canDelete(role) && (
                    <Btn variant="danger" className="!text-xs" onClick={() => setDeleteId(r.id)}>حذف</Btn>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-slate-500 col-span-2 text-center py-12">لا توجد عهد</p>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="إصدار عهدة جديدة" wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="المُسلَّم إليه" required>
              <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} required>
                <option value="">اختر...</option>
                {assignable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="المشروع (اختياري)">
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">بدون مشروع</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="الغرض" required><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required /></Field>
            <Field label="المبلغ المخصص" required><NumberInput value={form.allocatedAmount} onChange={(allocatedAmount) => setForm({ ...form, allocatedAmount })} required /></Field>
            <Field label="تاريخ الإصدار"><Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} /></Field>
          </div>
          <Field label="ملاحظات"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <Modal open={!!useModal} onClose={() => setUseModal(null)} title="صرف من العهدة">
        {useModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">المتبقي: {formatCurrency((useModal.remaining ?? useModal.allocatedAmount - useModal.usedAmount))}</p>
            <Field label="المبلغ" required>
              <NumberInput value={useAmount} onChange={setUseAmount} required />
            </Field>
            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setUseModal(null)}>إلغاء</Btn>
              <Btn onClick={onUse} loading={saving}>تأكيد الصرف</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذه العهدة؟" loading={saving} />
    </AppShell>
  );
}
