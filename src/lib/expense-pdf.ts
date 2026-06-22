import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { uploadsUrl, type Expense } from "@/lib/api";
import { dataTableHtml, exportPdfDocument, keyValueTableHtml } from "@/lib/pdf-export";

function attachmentBlock(url?: string | null, accessToken?: string | null) {
  if (!url) return "";
  const full = uploadsUrl(url, accessToken);
  return `<div class="attachment"><p><strong>المرفق:</strong> <a href="${full}" target="_blank">فتح المرفق من النظام</a></p></div>`;
}

export async function printExpensePdf(expense: Expense, accessToken?: string | null) {
  const body = `
    ${keyValueTableHtml([
      { label: "العنوان", value: expense.title },
      { label: "المشروع", value: expense.projectName ?? "—" },
      { label: "النوع", value: expense.type === "general" ? "مصروف عام" : "مرتبط ببند" },
      { label: "الفئة", value: expense.type === "general" ? expense.category : "—" },
      { label: "المبلغ", value: formatCurrency(expense.amount) },
      { label: "الحالة", value: STATUS_LABELS[expense.status] ?? expense.status },
      { label: "التاريخ", value: formatDate(expense.expenseDate) },
      { label: "مقدّم من", value: expense.submittedBy ?? "—" },
      ...(expense.description ? [{ label: "الوصف", value: expense.description }] : []),
    ])}
    ${attachmentBlock(expense.attachmentUrl, accessToken)}
  `;
  await exportPdfDocument({
    title: `مصروف — ${expense.title}`,
    filename: `مصروف-${expense.id}`,
    bodyHtml: body,
  });
}

export async function printAllExpensesPdf(expenses: Expense[], accessToken?: string | null) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const body = `
    ${dataTableHtml(
      ["العنوان", "المشروع", "النوع", "الفئة", "المبلغ", "الحالة", "التاريخ"],
      expenses.map((e) => [
        e.title,
        e.projectName ?? "—",
        e.type === "general" ? "عام" : "مرتبط ببند",
        e.type === "general" ? e.category : "—",
        formatCurrency(e.amount),
        STATUS_LABELS[e.status] ?? e.status,
        formatDate(e.expenseDate),
      ]),
      ["الإجمالي", "", "", "", formatCurrency(total), `${expenses.length} عملية`, ""],
    )}
    ${expenses.filter((e) => e.attachmentUrl).map((e) =>
      `<div class="pdf-section"><h3 class="pdf-section-title">${e.title}</h3>${attachmentBlock(e.attachmentUrl, accessToken)}</div>`,
    ).join("")}
  `;
  await exportPdfDocument({
    title: "تقرير المصروفات",
    filename: "تقرير-المصروفات",
    bodyHtml: body,
  });
}