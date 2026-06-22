"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Modal, Field, Input, Select, Textarea, FormActions, Btn, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Contract, type Contractor, type ProjectPickerOption, type ProjectItem, type CatalogItem } from "@/lib/api";
import { canCreate, canViewContracts } from "@/lib/permissions";
import { RequireRole } from "@/components/require-role";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";

type ItemDraft = {
  projectItemId?: number; catalogItemId?: number; description: string; unit: string;
  quantity: number; unitPrice: number; companyUnitCost: number;
};

export default function ContractsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Contract[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [projects, setProjects] = useState<ProjectPickerOption[]>([]);
  const [boqItems, setBoqItems] = useState<ProjectItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [pickerTab, setPickerTab] = useState<"boq" | "catalog">("boq");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchBoq, setSearchBoq] = useState("");
  const [form, setForm] = useState({ projectId: "", contractorId: "", title: "", contractType: "quantity", items: [] as ItemDraft[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profitPreview, setProfitPreview] = useState({ total: 0, profit: 0, margin: 0 });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const contracts = await api.contracts(token).list();
      setRows(contracts);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
    Promise.all([
      api.contractors(token).list(),
      api.projects(token).picker(),
    ]).then(([co, p]) => {
      setContractors(co);
      setProjects(p);
    }).catch(console.error);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token) { setCatalogItems([]); return; }
    api.catalogItems(token).list({ active: true }).then(setCatalogItems).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !form.projectId) { setBoqItems([]); return; }
    api.projectItems(token, Number(form.projectId)).list().then(setBoqItems).catch(() => {});
  }, [token, form.projectId]);

  useEffect(() => {
    const total = form.items.reduce((s, i) => s + (form.contractType === "lump_sum" ? i.unitPrice : i.quantity * i.unitPrice), 0);
    const cost = form.items.reduce((s, i) => s + (form.contractType === "lump_sum" ? i.companyUnitCost : i.quantity * i.companyUnitCost), 0);
    const profit = cost - total;
    setProfitPreview({ total, profit, margin: cost > 0 ? (profit / cost) * 100 : 0 });
  }, [form.items, form.contractType]);

  const openAdd = () => {
    setForm({ projectId: "", contractorId: "", title: "", contractType: "quantity", items: [] });
    setError(null);
    setModal(true);
  };

  const addBoqItem = (item: ProjectItem) => {
    if (form.items.some((i) => i.projectItemId === item.id)) return;
    setForm({
      ...form,
      items: [...form.items, {
        projectItemId: item.id,
        description: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: Math.round(Number(item.unitPrice) * 0.75 * 100) / 100,
        companyUnitCost: Number(item.unitPrice),
      }],
    });
    setPickerOpen(false);
  };

  const addCatalogItem = (item: CatalogItem) => {
    if (form.items.some((i) => i.catalogItemId === item.id)) return;
    setForm({
      ...form,
      items: [...form.items, {
        catalogItemId: item.id,
        description: item.name,
        unit: item.unit,
        quantity: 1,
        unitPrice: Math.round(item.defaultUnitPrice * 0.75 * 100) / 100,
        companyUnitCost: item.defaultUnitPrice,
      }],
    });
    setPickerOpen(false);
  };

  const addLumpItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: "", unit: "مقطوع", quantity: 1, unitPrice: 0, companyUnitCost: 0 }],
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    try {
      await api.contracts(token).create(form);
      setModal(false);
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const filteredBoq = boqItems.filter((i) =>
    !searchBoq || i.name.includes(searchBoq) || String(i.id).includes(searchBoq)
  );
  const filteredCatalog = catalogItems.filter((i) =>
    !searchBoq || i.name.includes(searchBoq) || (i.code?.includes(searchBoq)) || (i.category?.includes(searchBoq))
  );

  const role = user?.role ?? "";

  return (
    <RequireRole allow={canViewContracts}>
    <AppShell title="عقود المقاولين">
      {canCreate(role, "contracts") && (
        <div className="mb-6 flex justify-end">
          <Btn onClick={openAdd}>+ عقد جديد</Btn>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400">
                <th className="text-right p-4">العقد</th>
                <th className="text-right p-4">المشروع</th>
                <th className="text-right p-4">المقاول</th>
                <th className="text-right p-4">النوع</th>
                <th className="text-right p-4">القيمة</th>
                <th className="text-right p-4">الربح المتوقع</th>
                <th className="text-right p-4">البنود</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="p-4 text-white font-medium">{c.title}</td>
                  <td className="p-4 text-slate-300">{c.projectName}</td>
                  <td className="p-4 text-slate-300">{c.contractorName}</td>
                  <td className="p-4"><Badge variant="info">{c.contractType === "lump_sum" ? "مقطوعي" : "كميات"}</Badge></td>
                  <td className="p-4 text-money-default">{formatCurrency(c.totalValue)}</td>
                  <td className="p-4 text-money-positive">{formatCurrency(c.expectedProfit ?? 0)}</td>
                  <td className="p-4 text-slate-400">{c.itemsCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-center text-slate-500 py-12">لا توجد عقود</p>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="عقد مقاول جديد" wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="المشروع" required>
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, items: [] })} required>
                <option value="">اختر...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="المقاول" required>
              <Select value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })} required>
                <option value="">اختر...</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="عنوان العقد" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label="نوع التعاقد">
              <Select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value, items: [] })}>
                <option value="quantity">بالكميات</option>
                <option value="lump_sum">مقطوعي</option>
              </Select>
            </Field>
          </div>

          <div className="flex gap-2">
            {form.contractType === "quantity" ? (
              <Btn type="button" variant="secondary" onClick={() => setPickerOpen(true)} disabled={!form.projectId}>
                <Plus className="h-4 w-4" /> اختيار البنود
              </Btn>
            ) : (
              <Btn type="button" variant="secondary" onClick={addLumpItem}>+ بند مقطوعي</Btn>
            )}
          </div>

          {form.items.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 grid grid-cols-6 gap-2 items-center text-sm">
                  <span className="col-span-2 text-white truncate">{item.description || "بند جديد"}</span>
                  {form.contractType === "quantity" && (
                    <>
                      <NumberInput value={item.quantity} onChange={(quantity) => {
                        const items = [...form.items]; items[idx].quantity = quantity; setForm({ ...form, items });
                      }} />
                      <NumberInput placeholder="تكلفة الشركة" value={item.companyUnitCost} onChange={(companyUnitCost) => {
                        const items = [...form.items]; items[idx].companyUnitCost = companyUnitCost; setForm({ ...form, items });
                      }} />
                    </>
                  )}
                  <NumberInput placeholder="سعر المقاول" value={item.unitPrice} onChange={(unitPrice) => {
                    const items = [...form.items]; items[idx].unitPrice = unitPrice; setForm({ ...form, items });
                  }} />
                  <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="text-rose-400"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-lg bg-slate-800/50 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-slate-400">قيمة العقد</p><p className="text-lg text-money-default">{formatCurrency(profitPreview.total)}</p></div>
            <div><p className="text-xs text-slate-400">هامش الربح</p><p className="text-lg text-money-positive">{formatCurrency(profitPreview.profit)}</p></div>
            <div><p className="text-xs text-slate-400">نسبة الربح</p><p className="text-lg font-bold text-white">{profitPreview.margin.toFixed(1)}%</p></div>
          </div>

          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="اختيار البنود" wide>
        <div className="flex gap-2 mb-4">
          <Btn type="button" variant={pickerTab === "boq" ? "primary" : "ghost"} onClick={() => setPickerTab("boq")}>بنود المشروع (BOQ)</Btn>
          <Btn type="button" variant={pickerTab === "catalog" ? "primary" : "ghost"} onClick={() => setPickerTab("catalog")}>دليل البنود</Btn>
        </div>
        <Input placeholder="بحث..." value={searchBoq} onChange={(e) => setSearchBoq(e.target.value)} className="mb-4" />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {pickerTab === "boq" ? (
            filteredBoq.length === 0 ? (
              <p className="text-center text-slate-500 py-8">لا توجد بنود في المشروع — أضفها من BOQ أو استخدم دليل البنود</p>
            ) : filteredBoq.map((item) => (
              <button key={item.id} type="button" onClick={() => addBoqItem(item)} className="w-full text-right p-3 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/25 transition-colors">
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-xs text-slate-400 mr-3">{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
              </button>
            ))
          ) : (
            filteredCatalog.length === 0 ? (
              <p className="text-center text-slate-500 py-8">الدليل فارغ — أضف بنوداً من صفحة «دليل البنود»</p>
            ) : filteredCatalog.map((item) => (
              <button key={item.id} type="button" onClick={() => addCatalogItem(item)} className="w-full text-right p-3 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/25 transition-colors">
                <span className="text-sky-400 font-mono text-xs ml-2">{item.code ?? ""}</span>
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-xs text-slate-400 mr-3">{item.unit} × {formatCurrency(item.defaultUnitPrice)}</span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </AppShell>
    </RequireRole>
  );
}
