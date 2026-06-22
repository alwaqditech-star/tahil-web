"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, Textarea, FormActions, PageToolbar, Btn } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Task, type UserRow, API_BASE_URL } from "@/lib/api";
import { canCreateTask, canRunSmartTasks } from "@/lib/permissions";
import { Loader2, AlertTriangle, Clock } from "lucide-react";

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجلة",
};
const STATUS_LABELS: Record<string, string> = {
  new: "جديدة", in_progress: "قيد التنفيذ", review: "بانتظار المراجعة", completed: "مكتملة", rejected: "مرفوضة",
};

const empty = () => ({
  title: "", description: "", projectId: "", assigneeId: "", priority: "medium", dueDate: "",
});

export default function TasksPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty());
  const [filter, setFilter] = useState("all");
  const [mine, setMine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const q = new URLSearchParams();
    if (filter !== "all") q.set("status", filter);
    if (mine) q.set("mine", "true");
    apiFetchTasks(token, q.toString()).then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [token, filter, mine]);

  async function apiFetchTasks(token: string, query: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks?${query}`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" });
    return res.json();
  }

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!token || !canCreateTask(user?.role ?? "")) return;
    api.assignableUsers(token).then((list) => setUsers(list.map((u) => ({ ...u, email: "", username: null, department: null })))).catch(() => {});
  }, [token, user]);

  const openAdd = () => { setForm(empty()); setError(null); setModal(true); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    try {
      await api.tasks(token).create({
        title: form.title,
        description: form.description,
        assigneeId: Number(form.assigneeId),
        projectId: form.projectId ? Number(form.projectId) : null,
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
      setModal(false);
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const changeStatus = async (id: number, status: string) => {
    if (!token) return;
    await api.tasks(token).patch(id, { status });
    load();
  };

  const runAutomation = async () => {
    if (!token) return;
    const r = await api.tasks(token).automate();
    alert(`تم إنشاء ${r.created} مهمة تلقائية`);
    load();
  };

  const role = user?.role ?? "";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="إدارة المهام">
      <div className="flex flex-wrap gap-3 mb-6 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {["all", "new", "in_progress", "review", "completed"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? "bg-blue-500/15 text-white border border-blue-500/30" : "bg-white/5 text-slate-400"}`}>
              {s === "all" ? "الكل" : STATUS_LABELS[s]}
            </button>
          ))}
          <button onClick={() => setMine(!mine)} className={`px-3 py-1.5 rounded-lg text-sm ${mine ? "bg-blue-500/15 text-white border border-blue-500/30" : "bg-white/5 text-slate-400"}`}>مهامي</button>
        </div>
        <div className="flex gap-2">
          {canRunSmartTasks(role) && <Btn variant="secondary" onClick={runAutomation}>مهام ذكية</Btn>}
          {canCreateTask(role) && <Btn onClick={openAdd}>+ مهمة جديدة</Btn>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => {
            const overdue = t.dueDate && t.dueDate < today && !["completed", "rejected"].includes(t.status);
            const urgent = t.priority === "urgent" || t.priority === "high";
            return (
              <div key={t.id} className="glass-card p-5 flex flex-wrap gap-4 items-start justify-between">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-bold text-white">{t.title}</h3>
                    <Badge variant={statusVariant(t.status)}>{STATUS_LABELS[t.status] ?? t.status}</Badge>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{PRIORITY_LABELS[t.priority] ?? t.priority}</span>
                    {overdue && <span className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> متأخرة</span>}
                    {t.source === "auto" && <span className="text-xs text-amber-400">تلقائية</span>}
                  </div>
                  {t.description && <p className="text-sm text-slate-400 mb-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    {t.assigneeName && <span>المكلف: {t.assigneeName}</span>}
                    {t.projectName && <span>المشروع: {t.projectName}</span>}
                    {t.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.dueDate}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {t.status === "new" && (t.assigneeId === user?.id || canCreateTask(role)) && (
                    <Btn variant="secondary" className="!text-xs !px-2 !py-1" onClick={() => changeStatus(t.id, "in_progress")}>بدء</Btn>
                  )}
                  {t.status === "in_progress" && t.assigneeId === user?.id && (
                    <Btn variant="success" className="!text-xs !px-2 !py-1" onClick={() => changeStatus(t.id, "review")}>إرسال للمراجعة</Btn>
                  )}
                  {t.status === "review" && canCreateTask(role) && (
                    <>
                      <Btn variant="success" className="!text-xs !px-2 !py-1" onClick={() => changeStatus(t.id, "completed")}>اعتماد</Btn>
                      <Btn variant="danger" className="!text-xs !px-2 !py-1" onClick={() => changeStatus(t.id, "rejected")}>رفض</Btn>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-center text-slate-500 py-12">لا توجد مهام</p>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="مهمة جديدة" wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <Field label="العنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="الوصف"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المكلف" required>
              <Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} required>
                <option value="">اختر...</option>
                {users.filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </Select>
            </Field>
            <Field label="الأولوية">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </Select>
            </Field>
            <Field label="تاريخ الاستحقاق"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </AppShell>
  );
}
