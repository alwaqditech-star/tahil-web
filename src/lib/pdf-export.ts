function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COMPANY = "تأهيل الاعمار";
const SUBTITLE = "نظام إدارة المقاولات";

function safeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "report";
}

export const PDF_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: Tahoma, "Segoe UI", Arial, sans-serif; color: #0f172a; }
  .pdf-doc { max-width: 210mm; margin: 0 auto; background: #fff; min-height: 100vh; }
  .pdf-header { background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #fff; padding: 28px 32px 24px; border-bottom: 4px solid #c9a066; }
  .pdf-brand { font-size: 13px; color: #e8c99a; letter-spacing: 0.5px; margin-bottom: 6px; }
  .pdf-title { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.4; }
  .pdf-meta { margin: 10px 0 0; font-size: 11px; color: #cbd5e1; }
  .pdf-body { padding: 28px 32px 36px; }
  .pdf-section { margin-top: 24px; }
  .pdf-section:first-child { margin-top: 0; }
  .pdf-section-title { font-size: 14px; font-weight: 700; color: #1a365d; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .pdf-note { font-size: 12px; color: #475569; margin: 0 0 16px; line-height: 1.6; }
  table.pdf-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  table.pdf-table th, table.pdf-table td { border: 1px solid #cbd5e1; padding: 9px 10px; text-align: right; vertical-align: top; }
  table.pdf-table th { background: #1a365d; color: #fff; font-weight: 600; }
  table.pdf-table tbody tr:nth-child(even) { background: #f8fafc; }
  table.pdf-table tfoot td { background: #fef3c7; font-weight: 700; color: #1a365d; border-top: 2px solid #c9a066; }
  table.pdf-kv { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  table.pdf-kv th { width: 34%; background: #f1f5f9; color: #334155; font-weight: 600; border: 1px solid #e2e8f0; padding: 10px 12px; text-align: right; }
  table.pdf-kv td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: right; }
  .pdf-footer { padding: 14px 32px 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .attachment { margin-top: 16px; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 11px; }
  .attachment img { max-width: 100%; max-height: 360px; margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 4px; }
  .pdf-toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #0f172a; border-bottom: 1px solid #334155; }
  .pdf-toolbar button { border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; cursor: pointer; font-family: inherit; }
  .pdf-toolbar .primary { background: #c9a066; color: #1a365d; font-weight: 700; }
  .pdf-toolbar .ghost { background: #334155; color: #fff; }
  @media print {
    body { background: #fff; }
    .pdf-toolbar { display: none !important; }
    .pdf-doc { max-width: none; box-shadow: none; }
    table.pdf-table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  }
`;

export function buildDocumentHtml(title: string, bodyHtml: string, withToolbar = false) {
  const toolbar = withToolbar
    ? `<div class="pdf-toolbar">
        <button class="primary" onclick="window.print()">طباعة</button>
        <button class="ghost" onclick="window.close()">إغلاق</button>
      </div>`
    : "";
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${toolbar}
  <div class="pdf-doc">
    <header class="pdf-header">
      <div class="pdf-brand">${COMPANY}</div>
      <h1 class="pdf-title">${escapeHtml(title)}</h1>
      <p class="pdf-meta">${SUBTITLE} — تاريخ التصدير: ${new Date().toLocaleString("ar-SA")}</p>
    </header>
    <main class="pdf-body">${bodyHtml}</main>
    <footer class="pdf-footer">${COMPANY} — ${SUBTITLE}</footer>
  </div>
</body>
</html>`;
}

export function sectionTitle(text: string) {
  return `<h3 class="pdf-section-title">${escapeHtml(text)}</h3>`;
}

export function keyValueTableHtml(items: { label: string; value: string }[]) {
  const rows = items.map((i) =>
    `<tr><th>${escapeHtml(i.label)}</th><td>${escapeHtml(i.value)}</td></tr>`,
  ).join("");
  return `<table class="pdf-kv">${rows}</table>`;
}

export function dataTableHtml(
  headers: string[],
  rows: string[][],
  footerRow?: string[],
) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows.map((r) =>
    `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`,
  ).join("");
  const foot = footerRow
    ? `<tfoot><tr>${footerRow.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr></tfoot>`
    : "";
  return `<table class="pdf-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
}

export type PdfExportOptions = {
  title: string;
  bodyHtml: string;
  filename?: string;
};

/** تحميل ملف PDF — بدون فتح نافذة الطباعة تلقائياً */
export async function exportPdfDocument({ title, bodyHtml, filename }: PdfExportOptions) {
  if (typeof window === "undefined") return;

  const { default: html2pdf } = await import("html2pdf.js");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildDocumentHtml(title, bodyHtml, false);
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff";
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector(".pdf-doc") as HTMLElement;
  if (!target) {
    document.body.removeChild(wrapper);
    throw new Error("تعذر إنشاء مستند PDF");
  }

  try {
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `${safeFilename(filename ?? title)}.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(target)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** معاينة في تبويب جديد مع زر طباعة اختياري */
export function previewPdfDocument({ title, bodyHtml }: PdfExportOptions) {
  const win = window.open("", "_blank", "width=960,height=800");
  if (!win) {
    alert("يرجى السماح بالنوافذ المنبثقة لمعاينة التقرير");
    return;
  }
  win.document.write(buildDocumentHtml(title, bodyHtml, true));
  win.document.close();
}

/** للتوافق مع الاستدعاءات القديمة — يحمّل PDF ولا يطبع مباشرة */
export async function printHtmlDocument(title: string, bodyHtml: string, filename?: string) {
  await exportPdfDocument({ title, bodyHtml, filename });
}
