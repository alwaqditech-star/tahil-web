import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import { printHtmlDocument } from "@/lib/print-pdf";
import type {
  FinancialReport, ProjectReport, ContractorReport, SupplierReport,
  ExpenseReport, ExtractReport, PettyCashReport,
} from "@/lib/api";

function printReportTablePdf(title: string, headers: string[], rows: string[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  printHtmlDocument(title, `<table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`);
}

export { printReportTablePdf };

function summaryRows(items: { label: string; value: string }[]) {
  return items.map((i) => `<tr><th>${i.label}</th><td>${i.value}</td></tr>`).join("");
}

export function printFinancialOverviewPdf(data: FinancialReport, filterLabel: string) {
  const body = `
    <p><strong>النطاق:</strong> ${filterLabel}</p>
    <table>${summaryRows([
      { label: "إجمالي الإيرادات", value: formatCurrency(data.summary.totalRevenue) },
      { label: "إجمالي المصروفات", value: formatCurrency(data.summary.totalExpenses) },
      { label: "إجمالي الأرباح", value: formatCurrency(data.summary.totalProfit) },
      { label: "هامش الربح", value: `${data.summary.profitMargin}%` },
    ])}</table>
    <h3 style="margin-top:20px;font-size:14px">المصروفات حسب التصنيف</h3>
    <table>
      <thead><tr><th>التصنيف</th><th>المبلغ</th><th>النسبة</th></tr></thead>
      <tbody>${data.expensesByCategory.map((c) =>
        `<tr><td>${c.category}</td><td>${formatCurrency(c.amount)}</td><td>${c.percent}%</td></tr>`
      ).join("")}</tbody>
    </table>`;
  printHtmlDocument("التقرير المالي — نظرة عامة", body);
}

export function printProjectReportPdf(report: ProjectReport) {
  const p = report.project;
  const s = report.summary;
  const body = `
    <p><strong>المشروع:</strong> ${p.name} — ${p.client ?? ""}</p>
    <table>${summaryRows([
      { label: "قيمة العقد", value: formatCurrency(p.contractValue) },
      { label: "الميزانية", value: formatCurrency(p.budgetAllocated) },
      { label: "مصروفات معتمدة", value: formatCurrency(s.totalExpenses) },
      { label: "إجمالي المصروفات (كل الحالات)", value: formatCurrency(s.totalExpensesAll) },
      { label: "مصروفات غير مدفوعة/معلقة", value: formatCurrency(s.pendingExpenses) },
      { label: "مصروفات مدفوعة", value: formatCurrency(s.paidExpenses) },
      { label: "إجمالي المستخلصات", value: formatCurrency(s.totalExtracts) },
      { label: "مستخلصات مدفوعة", value: formatCurrency(s.paidExtracts) },
      { label: "هامش الربح", value: `${s.profitMargin}%` },
    ])}</table>
    <h3 style="margin-top:20px;font-size:14px">بنود العقد</h3>
    <table>
      <thead><tr><th>الوصف</th><th>الوحدة</th><th>الكمية</th><th>الإجمالي</th><th>المنجز</th></tr></thead>
      <tbody>${report.contractItems.map((i) =>
        `<tr><td>${i.description}</td><td>${i.unit}</td><td>${i.quantity}</td><td>${formatCurrency(i.total)}</td><td>${i.executedQuantity} (${i.progressPercent}%)</td></tr>`
      ).join("")}</tbody>
    </table>`;
  printHtmlDocument(`تقرير مشروع — ${p.name}`, body);
}

export function printContractorReportPdf(report: ContractorReport) {
  const c = report.contractor;
  const s = report.summary;
  const body = `
    <p><strong>المقاول:</strong> ${c.name}${c.companyName ? ` — ${c.companyName}` : ""}</p>
    <table>${summaryRows([
      { label: "نسبة الإنجاز", value: `${s.completionPercent}%` },
      { label: "إجمالي المستخلصات", value: formatCurrency(s.totalExtracts) },
      { label: "قيمة العقود", value: formatCurrency(s.contractValue) },
      { label: "مستحق للمقاول", value: formatCurrency(s.dueToContractor) },
      { label: "مدفوع للمقاول", value: formatCurrency(s.paidToContractor) },
    ])}</table>
    <h3 style="margin-top:20px;font-size:14px">المستخلصات</h3>
    <table>
      <thead><tr><th>الرقم</th><th>التاريخ</th><th>المشروع</th><th>المبلغ</th><th>الحالة</th></tr></thead>
      <tbody>${report.extracts.map((e) =>
        `<tr><td>${e.extractNumber}</td><td>${formatDate(e.extractDate)}</td><td>${e.projectName}</td><td>${formatCurrency(e.amount)}</td><td>${STATUS_LABELS[e.status] ?? e.status}</td></tr>`
      ).join("")}</tbody>
    </table>`;
  printHtmlDocument(`تقرير مقاول — ${c.name}`, body);
}

export function printSupplierReportPdf(report: SupplierReport) {
  const s = report.supplier;
  const body = `
    <p><strong>المورد:</strong> ${s.name}${s.companyName ? ` — ${s.companyName}` : ""}</p>
    <table>${summaryRows([
      { label: "إجمالي المشتريات", value: formatCurrency(report.summary.totalPurchases) },
      { label: "المدفوع", value: formatCurrency(report.summary.paid) },
      { label: "المتبقي", value: formatCurrency(report.summary.remaining) },
      { label: "عدد الطلبات", value: String(report.summary.ordersCount) },
    ])}</table>`;
  printHtmlDocument(`تقرير مورد — ${s.name}`, body);
}

export function printExpenseReportPdf(report: ExpenseReport) {
  printReportTablePdf(
    "تقرير المصروفات",
    ["التاريخ", "العنوان", "المشروع", "التصنيف", "المبلغ", "الحالة"],
    report.rows.map((e) => [
      formatDate(e.expenseDate),
      e.title,
      e.projectName,
      e.category,
      formatCurrency(e.amount),
      STATUS_LABELS[e.status] ?? e.status,
    ]),
  );
}

export function printExtractReportPdf(report: ExtractReport) {
  printReportTablePdf(
    "تقرير المستخلصات",
    ["الرقم", "التاريخ", "المشروع", "المقاول", "المبلغ", "الحالة"],
    report.rows.map((e) => [
      e.extractNumber,
      formatDate(e.extractDate),
      e.projectName,
      e.contractorName,
      formatCurrency(e.amount),
      STATUS_LABELS[e.status] ?? e.status,
    ]),
  );
}

export function printPettyCashReportPdf(report: PettyCashReport) {
  printReportTablePdf(
    "تقرير العهد حسب الموظف",
    ["الموظف", "عدد العهد", "المخصص", "المستخدم", "المتبقي"],
    report.byEmployee.map((p) => [
      p.name,
      String(p.count),
      formatCurrency(p.allocated),
      formatCurrency(p.used),
      formatCurrency(p.remaining),
    ]),
  );
}
