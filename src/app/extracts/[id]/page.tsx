"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Btn, Field, Input, NumberInput } from "@/components/crud/ui";
import { useAuth } from "@/contexts/auth-context";
import { api, type Extract, type ExtractLine, type SmartExtractItem } from "@/lib/api";
import { canApproveExtractManager, canApproveExtractAccountant, canExportPdf, canCreate } from "@/lib/permissions";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { dataTableHtml, exportPdfDocument, keyValueTableHtml } from "@/lib/pdf-export";
import { Loader2, ArrowRight, Printer, Save, Send } from "lucide-react";

type LineDraft = ExtractLine & { remainingQuantity?: number; previousQuantity?: number; contractedQuantity?: number };

export default function ExtractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const extractId = parseInt(id);
  const { token, user } = useAuth();
  const [extract, setExtract] = useState<Extract | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [smartItems, setSmartItems] = useState<SmartExtractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const e = await api.extracts(token).get(extractId);
      setExtract(e);
      const saved = await api.extracts(token).lines(extractId);
      const editableStatus = ["draft", "submitted"].includes(e.status);

      if (e.contractorId && e.projectId && editableStatus) {
        const smart = await api.extracts(token).smartItems(e.projectId, e.contractorId, extractId);
        setSmartItems(smart);
        const merged: LineDraft[] = smart.map((s) => {
          const existing = saved.find((l) => l.contractItemId === s.contractItemId);
          return {
            contractItemId: s.contractItemId,
            projectItemId: s.projectItemId,
            description: s.description,
            unit: s.unit,
            quantity: existing?.quantity ?? 0,
            unitPrice: s.unitPrice,
            amount: (existing?.quantity ?? 0) * s.unitPrice,
            remainingQuantity: s.remainingQuantity,
            previousQuantity: s.previousQuantity,
            contractedQuantity: s.contractedQuantity,
          };
        });
        setLines(merged);
      } else if (saved.length) {
        setLines(saved);
      } else {
        setLines([]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, extractId]);

  useEffect(() => { load(); }, [load]);

  const updateQty = (idx: number, qty: number) => {
    setLines((prev) => {
      const next = [...prev];
      const item = next[idx];
      const max = item.remainingQuantity ?? Infinity;
      const safe = Math.max(0, Math.min(qty, max));
      next[idx] = { ...item, quantity: safe, amount: safe * item.unitPrice };
      return next;
    });
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const saveLines = async () => {
    if (!token) return;
    setSaving(true); setError(null);
    try {
      const toSave = lines.filter((l) => l.quantity > 0);
      await api.extracts(token).saveLines(extractId, toSave);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const doAction = async (action: string) => {
    if (!token) return;
    try {
      if (action === "submit") {
        const active = lines.filter((l) => l.quantity > 0);
        if (active.length === 0) { alert("أضف كميات منفذة أولاً"); return; }
        await api.extracts(token).saveLines(extractId, active);
      }
      await api.extracts(token).patch(extractId, { action });
      load();
    } catch (err) { alert(err instanceof Error ? err.message : "خطأ"); }
  };

  const exportPdf = async () => {
    if (!extract) return;
    const activeLines = lines.filter((l) => l.quantity > 0);
    setPdfBusy(true);
    try {
      const body = `
        ${keyValueTableHtml([
          { label: "رقم المستخلص", value: extract.extractNumber },
          { label: "العنوان", value: extract.title },
          { label: "المشروع", value: extract.projectName ?? "—" },
          { label: "المقاول", value: extract.contractorName ?? "—" },
          { label: "التاريخ", value: formatDate(extract.extractDate) },
          { label: "الحالة", value: STATUS_LABELS[extract.status] ?? extract.status },
          { label: "الإجمالي", value: formatCurrency(total || extract.amount) },
        ])}
        ${dataTableHtml(
          ["البند", "الوحدة", "الكمية", "السعر", "المبلغ"],
          activeLines.map((l) => [
            l.description,
            l.unit,
            String(l.quantity),
            formatCurrency(l.unitPrice),
            formatCurrency(l.quantity * l.unitPrice),
          ]),
          ["الإجمالي", "", "", "", formatCurrency(total || extract.amount)],
        )}
        <p class="pdf-note">المستخلص بدون ضريبة</p>
      `;
      await exportPdfDocument({
        title: `مستخلص مقاول — ${extract.extractNumber}`,
        filename: `مستخلص-${extract.extractNumber}`,
        bodyHtml: body,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر تصدير PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const role = user?.role ?? "";
  const editable = extract && ["draft", "submitted"].includes(extract.status) && canCreate(role, "extracts");

  if (loading) return <AppShell title="تفاصيل المستخلص"><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin spinner-brand" /></div></AppShell>;

  return (
    <AppShell title="تفاصيل المستخلص">
      <Link href="/extracts" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 mb-6">
        <ArrowRight className="h-4 w-4" /> العودة للمستخلصات
      </Link>

      {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

      {extract && (
        <>
          <div className="glass-card p-6 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="text-sky-400 font-mono text-sm">{extract.extractNumber}</p>
                <h2 className="text-2xl font-bold text-white mt-1">{extract.title}</h2>
                <p className="text-slate-400 mt-2">{extract.projectName} {extract.contractorName && `— ${extract.contractorName}`}</p>
              </div>
              <Badge variant={statusVariant(extract.status)}>{STATUS_LABELS[extract.status] ?? extract.status}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div><p className="text-xs text-slate-500">المبلغ (بدون ضريبة)</p><p className="text-2xl text-money-default">{formatCurrency(total || extract.amount)}</p></div>
              <div><p className="text-xs text-slate-500">التاريخ</p><p className="text-white">{formatDate(extract.extractDate)}</p></div>
              <div className="col-span-2 flex gap-2 items-end justify-end flex-wrap">
                {editable && (
                  <>
                    <Btn variant="secondary" onClick={saveLines} loading={saving}><Save className="h-4 w-4" /> حفظ البنود</Btn>
                    {extract.status === "draft" && (
                      <Btn onClick={() => doAction("submit")}><Send className="h-4 w-4" /> إرسال للاعتماد</Btn>
                    )}
                  </>
                )}
                {canExportPdf(role) && (
                  <Btn variant="secondary" onClick={exportPdf} loading={pdfBusy}>
                    <Printer className="h-4 w-4" /> تصدير PDF
                  </Btn>
                )}
                {extract.status === "submitted" && canApproveExtractManager(role) && <Btn variant="success" onClick={() => doAction("manager_approve")}>اعتماد المدير</Btn>}
                {extract.status === "manager_approved" && canApproveExtractAccountant(role) && <Btn variant="success" onClick={() => doAction("accountant_approve")}>اعتماد المحاسب</Btn>}
                {extract.status === "approved" && canApproveExtractAccountant(role) && <Btn variant="success" onClick={() => doAction("mark_paid")}>تسجيل الدفع</Btn>}
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <h3 className="p-4 font-bold text-white border-b border-white/10">
              {editable ? "المستخلص الذكي — أدخل الكميات المنفذة" : "بنود المستخلص"}
            </h3>
            {smartItems.length === 0 && editable ? (
              <p className="p-8 text-center text-slate-500">لا توجد بنود عقد لهذا المقاول — أنشئ عقداً أولاً من صفحة العقود</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-right p-4">البند</th>
                    <th className="text-right p-4">الوحدة</th>
                    <th className="text-right p-4">المتعاقد</th>
                    <th className="text-right p-4">منفذ سابقاً</th>
                    <th className="text-right p-4">المتبقي</th>
                    <th className="text-right p-4">المنفذ الآن</th>
                    <th className="text-right p-4">السعر</th>
                    <th className="text-right p-4">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.contractItemId ?? idx} className="border-b border-white/5">
                      <td className="p-4 text-white">{l.description}</td>
                      <td className="p-4">{l.unit}</td>
                      <td className="p-4 text-slate-400">{l.contractedQuantity ?? "—"}</td>
                      <td className="p-4 text-slate-400">{l.previousQuantity ?? 0}</td>
                      <td className="p-4 text-sky-400 font-bold">{l.remainingQuantity ?? "—"}</td>
                      <td className="p-4">
                        {editable ? (
                          <NumberInput
                            min={0}
                            max={l.remainingQuantity}
                            value={l.quantity}
                            onChange={(quantity) => updateQty(idx, quantity)}
                            className="!w-24"
                          />
                        ) : l.quantity}
                      </td>
                      <td className="p-4">{formatCurrency(l.unitPrice)}</td>
                      <td className="p-4 text-money-default font-bold">{formatCurrency(l.quantity * l.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white/3">
                    <td colSpan={7} className="p-4 text-left font-bold text-white">الإجمالي</td>
                    <td className="p-4 text-money-default font-bold text-lg">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
