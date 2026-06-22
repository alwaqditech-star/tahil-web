"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, FormActions, RowActions, PageToolbar, ConfirmDialog } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type UserRow, type ProjectPickerOption } from "@/lib/api";
import { canCreate, canEdit, canDelete } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type UserForm = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  department: string;
  isActive: boolean;
  assignedProjectId: number;
  assignedProjectIds: number[];
};

const empty = (): UserForm => ({
  name: "",
  email: "",
  username: "",
  password: "",
  role: "project_manager",
  department: "",
  isActive: true,
  assignedProjectId: 0,
  assignedProjectIds: [],
});

const FIELD_PROJECT_ROLES = new Set(["site_supervisor", "project_engineer"]);

function needsMultipleProjects(role: string) {
  return role === "project_manager";
}

function needsSingleProject(role: string) {
  return FIELD_PROJECT_ROLES.has(role);
}

export default function UsersPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectPickerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(empty());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  /** مشاريع مسندة لمديري مشاريع آخرين (يُستثنى المستخدم الحالي عند التعديل) */
  const takenByOtherManagers = useMemo(() => {
    const taken = new Set<number>();
    for (const u of rows) {
      if (u.role !== "project_manager" || u.id === editId) continue;
      for (const id of u.assignedProjectIds ?? []) taken.add(id);
    }
    return taken;
  }, [rows, editId]);

  const availableProjectsForManager = useMemo(() => {
    return projects.filter(
      (p) => !takenByOtherManagers.has(p.id) || form.assignedProjectIds.includes(p.id),
    );
  }, [projects, takenByOtherManagers, form.assignedProjectIds]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([api.users(token).list(), api.projects(token).picker()])
      .then(([users, proj]) => {
        setRows(users);
        setProjects(proj);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const formatUserProjects = (u: UserRow) => {
    if (u.role === "project_manager") {
      const ids = u.assignedProjectIds ?? [];
      if (ids.length === 0) return "—";
      return ids.map((id) => projectNames.get(id) ?? `#${id}`).join("، ");
    }
    if (needsSingleProject(u.role)) {
      return u.assignedProjectId ? (projectNames.get(u.assignedProjectId) ?? `#${u.assignedProjectId}`) : "—";
    }
    return "—";
  };

  const openAdd = () => {
    setEditId(null);
    setForm(empty());
    setError(null);
    setModal(true);
  };

  const openEdit = (u: UserRow) => {
    setEditId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      username: u.username ?? "",
      password: "",
      role: u.role,
      department: u.department ?? "",
      isActive: u.isActive,
      assignedProjectId: u.assignedProjectId ?? 0,
      assignedProjectIds: u.assignedProjectIds ?? [],
    });
    setError(null);
    setModal(true);
  };

  const onRoleChange = (role: string) => {
    setForm((prev) => ({
      ...prev,
      role,
      assignedProjectId: needsSingleProject(role) ? prev.assignedProjectId : 0,
      assignedProjectIds: needsMultipleProjects(role) ? prev.assignedProjectIds : [],
    }));
  };

  const toggleProject = (projectId: number, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      assignedProjectIds: checked
        ? [...prev.assignedProjectIds, projectId]
        : prev.assignedProjectIds.filter((id) => id !== projectId),
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        email: form.email,
        username: form.username,
        password: form.password || undefined,
        role: form.role,
        department: form.department,
        isActive: form.isActive,
        assignedProjectId: needsSingleProject(form.role) && form.assignedProjectId > 0
          ? form.assignedProjectId
          : null,
        assignedProjectIds: needsMultipleProjects(form.role) ? form.assignedProjectIds : [],
      };
      if (editId) await api.users(token).update(editId, body);
      else await api.users(token).create(body);
      setModal(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!token || !deleteId) return;
    setSaving(true);
    try {
      await api.users(token).remove(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const role = user?.role ?? "";

  return (
    <AppShell title="إدارة المستخدمين">
      <PageToolbar onAdd={canCreate(role, "users") ? openAdd : undefined} addLabel="مستخدم جديد" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right p-4">الاسم</th>
                  <th className="text-right p-4">البريد</th>
                  <th className="text-right p-4">اسم المستخدم</th>
                  <th className="text-right p-4">الدور</th>
                  <th className="text-right p-4">المشاريع المسندة</th>
                  <th className="text-right p-4">القسم</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="p-4 text-white font-medium">{u.name}</td>
                    <td className="p-4 text-slate-400">{u.email}</td>
                    <td className="p-4 text-sky-400 font-mono">{u.username}</td>
                    <td className="p-4"><Badge variant="info">{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                    <td className="p-4 text-slate-300 max-w-xs">{formatUserProjects(u)}</td>
                    <td className="p-4 text-slate-500">{u.department ?? "—"}</td>
                    <td className="p-4"><Badge variant={u.isActive ? statusVariant("active") : statusVariant("inactive")}>{u.isActive ? "نشط" : "معطّل"}</Badge></td>
                    <td className="p-4">
                      <RowActions onEdit={canEdit(role, "users") ? () => openEdit(u) : undefined} onDelete={canDelete(role) && u.id !== user?.id ? () => setDeleteId(u.id) : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل مستخدم" : "إضافة مستخدم"} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="البريد" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="اسم المستخدم" required><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></Field>
            <Field label={editId ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"} required={!editId}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} />
            </Field>
            <Field label="الدور">
              <Select value={form.role} onChange={(e) => onRoleChange(e.target.value)}>
                <option value="admin">مدير النظام</option>
                <option value="project_manager">مدير مشاريع</option>
                <option value="accountant">محاسب</option>
                <option value="site_supervisor">مشرف موقع</option>
                <option value="project_engineer">مهندس مشروع</option>
              </Select>
            </Field>
            <Field label="القسم"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="الحالة">
              <Select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
                <option value="true">نشط</option>
                <option value="false">معطّل</option>
              </Select>
            </Field>

            {needsMultipleProjects(form.role) && (
              <div className="col-span-2">
                <Field label="المشاريع المسندة">
                {availableProjectsForManager.length === 0 ? (
                  <p className="text-sm text-slate-500">لا توجد مشاريع متاحة للإسناد — كل المشاريع مسندة لمديري مشاريع آخرين</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                    {availableProjectsForManager.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          className="rounded border-white/20"
                          checked={form.assignedProjectIds.includes(p.id)}
                          onChange={(e) => toggleProject(p.id, e.target.checked)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-500">كل مشروع يُسند لمدير مشاريع واحد فقط — المشاريع المسندة لمدير آخر لا تظهر هنا</p>
                </Field>
              </div>
            )}

            {needsSingleProject(form.role) && (
              <div className="col-span-2">
                <Field label="المشروع المسند">
                <Select
                  value={form.assignedProjectId || ""}
                  onChange={(e) => setForm({ ...form, assignedProjectId: Number(e.target.value) || 0 })}
                >
                  <option value="">— اختر مشروع —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-slate-500">مشرف الموقع ومهندس المشروع يرتبطان بمشروع واحد</p>
                </Field>
              </div>
            )}
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete} message="هل أنت متأكد من حذف هذا المستخدم؟" loading={saving} />
    </AppShell>
  );
}
