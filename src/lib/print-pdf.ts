/** فتح نافذة طباعة (حفظ كـ PDF من المتصفح) */
export function printHtmlDocument(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("يرجى السماح بالنوافذ المنبثقة للطباعة");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
    th { background: #f0f0f0; }
    .attachment { margin-top: 16px; page-break-inside: avoid; }
    .attachment img { max-width: 100%; max-height: 400px; border: 1px solid #ddd; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">تاريخ الطباعة: ${new Date().toLocaleString("ar-SA")}</p>
  ${bodyHtml}
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}
