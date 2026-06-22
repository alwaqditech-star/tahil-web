import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import {
  dataTableHtml, exportPdfDocument, keyValueTableHtml, sectionTitle,
} from "@/lib/pdf-export";
import type {
  FinancialReport, ProjectReport, ContractorReport, SupplierReport,
  ExpenseReport, ExtractReport, PettyCashReport,
} from "@/lib/api";

export async function printReportTablePdf(
  title: string,
  headers: string[],
  rows: string[][],
  footerRow?: string[],
) {
  await exportPdfDocument({
    title,
    filename: title,
    bodyHtml: dataTableHtml(headers, rows, footerRow),
  });
}

function summaryTable(items: { label: string; value: string }[]) {
  return keyValueTableHtml(items);
}

export async function printFinancialOverviewPdf(data: FinancialReport, filterLabel: string) {
  const body = `
    <p class="pdf-note"><strong>النطاق:</strong> ${filterLabel}</p>
    ${summaryTable([
      { label: "إجمالي الإيرادات", value: formatCurrency(data.summary.totalRevenue) },
      { label: "إجمالي المصروفات", value: formatCurrency(data.summary.totalExpenses) },
      { label: "إجمالي الأرباح", value: formatCurrency(data.summary.totalProfit) },
      { label: "هامش الربح", value: `${data.summary.profitMargin}%` },
    ])}
    <div class="pdf-section">
      ${sectionTitle("توزيع المصروفات حسب التصنيف")}
      ${dataTableHtml(
        ["التصنيف", "المبلغ", "النسبة"],
        data.expensesByCategory.map((c) => [c.category, formatCurrency(c.amount), `${c.percent}%`]),
      )}
    </div>`;
  await exportPdfDocument({ title: "التقرير المالي — نظرة عامة", filename: "تقرير-نظرة-عامة", bodyHtml: body });
}

export async function printProjectReportPdf(report: ProjectReport) {
  const p = report.project;
  const s = report.summary;
  const body = `
    <p class="pdf-note"><strong>المشروع:</strong> ${p.name} — ${p.client ?? ""}</p>
    ${summaryTable([
      { label: "قيمة العقد", value: formatCurrency(p.contractValue) },
      { label: "الميزانية", value: formatCurrency(p.budgetAllocated) },
      { label: "نسبة الإنجاز", value: `${p.progressPercent}%` },
      { label: "مصروفات معتمدة", value: formatCurrency(s.totalExpenses) },
      { label: "إجمالي المصروفات", value: formatCurrency(s.totalExpensesAll) },
      { label: "مصروفات معلقة", value: formatCurrency(s.pendingExpenses) },
      { label: "مصروفات مدفوعة", value: formatCurrency(s.paidExpenses) },
      { label: "إجمالي المستخلصات", value: formatCurrency(s.totalExtracts) },
      { label: "مستخلصات معتمدة/مدفوعة", value: formatCurrency(s.costExtracts ?? s.paidExtracts) },
      { label: "إجمالي المشتريات", value: formatCurrency(s.totalPurchases) },
      { label: "إجمالي التكاليف", value: formatCurrency(s.totalCosts ?? 0) },
      { label: "صافي الربح", value: formatCurrency(s.profit ?? 0) },
      { label: "هامش الربح", value: `${s.profitMargin}%` },
    ])}
    <div class="pdf-section">
      ${sectionTitle("بنود العقد")}
      ${dataTableHtml(
        ["الوصف", "الوحدة", "الكمية", "الإجمالي", "المنجز"],
        report.contractItems.map((i) => [
          i.description,
          i.unit,
          String(i.quantity),
          formatCurrency(i.total),
          `${i.executedQuantity} (${i.progressPercent}%)`,
        ]),
      )}
    </div>`;
  await exportPdfDocument({ title: `تقرير مشروع — ${p.name}`, filename: `تقرير-مشروع-${p.id}`, bodyHtml: body });
}

export async function printContractorReportPdf(report: ContractorReport) {
  const c = report.contractor;
  const s = report.summary;
  const body = `
    <p class="pdf-note"><strong>المقاول:</strong> ${c.name}${c.companyName ? ` — ${c.companyName}` : ""}</p>
    ${summaryTable([
      { label: "نسبة الإنجاز", value: `${s.completionPercent}%` },
      { label: "إجمالي المستخلصات", value: formatCurrency(s.totalExtracts) },
      { label: "قيمة العقود", value: formatCurrency(s.contractValue) },
      { label: "مستحق للمقاول", value: formatCurrency(s.dueToContractor) },
      { label: "مدفوع للمقاول", value: formatCurrency(s.paidToContractor) },
    ])}
    <div class="pdf-section">
      ${sectionTitle("المستخلصات")}
      ${dataTableHtml(
        ["الرقم", "التاريخ", "المشروع", "المبلغ", "الحالة"],
        report.extracts.map((e) => [
          e.extractNumber,
          formatDate(e.extractDate),
          e.projectName,
          formatCurrency(e.amount),
          STATUS_LABELS[e.status] ?? e.status,
        ]),
      )}
    </div>`;
  await exportPdfDocument({ title: `تقرير مقاول — ${c.name}`, filename: `تقرير-مقاول-${c.id}`, bodyHtml: body });
}

export async function printSupplierReportPdf(report: SupplierReport) {
  const s = report.supplier;
  const body = `
    <p class="pdf-note"><strong>المورد:</strong> ${s.name}${s.companyName ? ` — ${s.companyName}` : ""}</p>
    ${summaryTable([
      { label: "إجمالي المشتريات", value: formatCurrency(report.summary.totalPurchases) },
      { label: "المدفوع", value: formatCurrency(report.summary.paid) },
      { label: "المتبقي", value: formatCurrency(report.summary.remaining) },
      { label: "عدد الطلبات", value: String(report.summary.ordersCount) },
    ])}
    <div class="pdf-section">
      ${sectionTitle("أوامر الشراء")}
      ${dataTableHtml(
        ["رقم الأمر", "المشروع", "الاسم", "التاريخ", "الإجمالي", "المدفوع", "الحالة"],
        report.purchases.map((p) => [
          p.purchaseNumber,
          p.projectName,
          p.title,
          formatDate(p.orderDate),
          formatCurrency(p.amount),
          formatCurrency(p.paidAmount),
          STATUS_LABELS[p.status] ?? p.status,
        ]),
      )}
    </div>`;
  await exportPdfDocument({ title: `تقرير مورد — ${s.name}`, filename: `تقرير-مورد-${s.id}`, bodyHtml: body });
}

export async function printExpenseReportPdf(report: ExpenseReport) {
  const total = report.rows.reduce((sum, e) => sum + e.amount, 0);
  await printReportTablePdf(
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
    ["الإجمالي", "", "", "", formatCurrency(total), `${report.rows.length} عملية`],
  );
}

export async function printExtractReportPdf(report: ExtractReport) {
  const total = report.rows.reduce((sum, e) => sum + e.amount, 0);
  await printReportTablePdf(
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
    ["الإجمالي", "", "", "", formatCurrency(total), `${report.rows.length} مستخلص`],
  );
}

export async function printPettyCashReportPdf(report: PettyCashReport) {
  const totalAllocated = report.byEmployee.reduce((s, p) => s + p.allocated, 0);
  const totalUsed = report.byEmployee.reduce((s, p) => s + p.used, 0);
  const totalRemaining = report.byEmployee.reduce((s, p) => s + p.remaining, 0);
  await printReportTablePdf(
    "تقرير العهد حسب الموظف",
    ["الموظف", "عدد العهد", "المخصص", "المستخدم", "المتبقي"],
    report.byEmployee.map((p) => [
      p.name,
      String(p.count),
      formatCurrency(p.allocated),
      formatCurrency(p.used),
      formatCurrency(p.remaining),
    ]),
    ["الإجمالي", String(report.byEmployee.length), formatCurrency(totalAllocated), formatCurrency(totalUsed), formatCurrency(totalRemaining)],
  );
}

export async function printEmployeePettyReportPdf(employee: PettyCashReport["byEmployee"][number]) {
  const body = `
    <p class="pdf-note"><strong>الموظف:</strong> ${employee.name}</p>
    ${summaryTable([
      { label: "عدد العهد", value: String(employee.count) },
      { label: "المخصص", value: formatCurrency(employee.allocated) },
      { label: "المستخدم", value: formatCurrency(employee.used) },
      { label: "المتبقي", value: formatCurrency(employee.remaining) },
      { label: "إجمالي المصروفات", value: formatCurrency(employee.expenseTotal) },
      { label: "عدد المصروفات", value: String(employee.expenseCount) },
    ])}
    <div class="pdf-section">
      ${sectionTitle(`سجلات العهد (${employee.custodies.length})`)}
      ${dataTableHtml(
        ["الغرض", "المشروع", "التاريخ", "المخصص", "المستخدم", "المتبقي", "الحالة"],
        employee.custodies.map((c) => [
          c.purpose,
          c.projectName,
          formatDate(c.issuedDate),
          formatCurrency(c.allocatedAmount),
          formatCurrency(c.usedAmount),
          formatCurrency(c.remaining),
          STATUS_LABELS[c.status] ?? c.status,
        ]),
      )}
    </div>
    <div class="pdf-section">
      ${sectionTitle(`المصروفات (${employee.expenses.length})`)}
      ${dataTableHtml(
        ["التاريخ", "العنوان", "المشروع", "التصنيف", "المبلغ", "الحالة"],
        employee.expenses.map((e) => [
          formatDate(e.expenseDate),
          e.title,
          e.projectName,
          e.category,
          formatCurrency(e.amount),
          STATUS_LABELS[e.status] ?? e.status,
        ]),
      )}
    </div>`;
  await exportPdfDocument({
    title: `تقرير عهد — ${employee.name}`,
    filename: `عهد-${employee.name}`,
    bodyHtml: body,
  });
}
