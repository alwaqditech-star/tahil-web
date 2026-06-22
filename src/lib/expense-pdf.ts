import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { uploadsUrl, type Expense } from "@/lib/api";
import { printHtmlDocument } from "@/lib/print-pdf";

function attachmentBlock(url?: string | null, accessToken?: string | null) {
  if (!url) return "";
  const full = uploadsUrl(url, accessToken);
  const isPdf = url.toLowerCase().endsWith(".pdf");
  if (isPdf || url.includes("/api/files/")) {
    return `<div class="attachment"><p><strong>المرفق:</strong> <a href="${full}" target="_blank">فتح المرفق</a></p></div>`;
  }
  return `<div class="attachment"><p><strong>المرفق:</strong></p><img src="${full}" alt="مرفق" /></div>`;
}

function expenseRowHtml(e: Expense) {
  return `<tr>
    <td>${e.title}</td>
    <td>${e.projectName ?? "—"}</td>
    <td>${e.category}</td>
    <td>${formatCurrency(e.amount)}</td>
    <td>${STATUS_LABELS[e.status] ?? e.status}</td>
    <td>${formatDate(e.expenseDate)}</td>
  </tr>`;
}

export function printExpensePdf(expense: Expense, accessToken?: string | null) {
  const body = `
    <table>
      <tr><th>العنوان</th><td>${expense.title}</td></tr>
      <tr><th>المشروع</th><td>${expense.projectName ?? "—"}</td></tr>
      <tr><th>الفئة</th><td>${expense.category}</td></tr>
      <tr><th>المبلغ</th><td>${formatCurrency(expense.amount)}</td></tr>
      <tr><th>الحالة</th><td>${STATUS_LABELS[expense.status] ?? expense.status}</td></tr>
      <tr><th>التاريخ</th><td>${formatDate(expense.expenseDate)}</td></tr>
      <tr><th>مقدّم من</th><td>${expense.submittedBy ?? "—"}</td></tr>
      ${expense.description ? `<tr><th>الوصف</th><td>${expense.description}</td></tr>` : ""}
    </table>
    ${attachmentBlock(expense.attachmentUrl, accessToken)}
  `;
  printHtmlDocument(`مصروف — ${expense.title}`, body);
}

export function printAllExpensesPdf(expenses: Expense[], accessToken?: string | null) {
  const rows = expenses.map(expenseRowHtml).join("");
  const attachments = expenses
    .filter((e) => e.attachmentUrl)
    .map((e) => `<h3 style="margin-top:24px;font-size:14px">${e.title}</h3>${attachmentBlock(e.attachmentUrl, accessToken)}`)
    .join("");
  const body = `
    <table>
      <thead><tr><th>العنوان</th><th>المشروع</th><th>الفئة</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${attachments}
  `;
  printHtmlDocument("تقرير المصروفات", body);
}

export function printReportTablePdf(title: string, headers: string[], rows: string[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  printHtmlDocument(title, `<table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`);
}
