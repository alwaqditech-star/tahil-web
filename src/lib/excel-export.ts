import ExcelJS from "exceljs";

type CellValue = string | number | boolean | null | undefined;

export type ExcelExportOptions = {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: CellValue[][];
  /** أعمدة المبالغ (1-based) — تنسيق رقمي */
  currencyColumns?: number[];
  /** أعمدة التاريخ (1-based) */
  dateColumns?: number[];
};

const HEADER_FILL = "FF1A365D";
const HEADER_FONT = "FFFFFFFF";
const ALT_ROW_FILL = "FFF8FAFC";
const BORDER_COLOR = "FFE2E8F0";

function cellBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function autoColumnWidth(ws: ExcelJS.Worksheet, headers: string[], min = 10, max = 48) {
  headers.forEach((header, index) => {
    const col = ws.getColumn(index + 1);
    let width = header.length + 4;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const val = row.getCell(index + 1).value;
      const text = val == null ? "" : String(val);
      width = Math.max(width, text.length + 2);
    });
    col.width = Math.min(Math.max(width, min), max);
  });
}

export async function downloadExcel({
  filename,
  sheetName = "البيانات",
  headers,
  rows,
  currencyColumns = [],
  dateColumns = [],
}: ExcelExportOptions) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "تأهيل الاعمار";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1, activeCell: "A2" }],
    properties: { defaultRowHeight: 20 },
  });

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11, name: "Arial" };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = cellBorder();
  });

  rows.forEach((rowData, rowIndex) => {
    const row = ws.addRow(rowData.map((v) => (v == null || v === "" ? "" : v)));
    row.height = 22;
    const isAlt = rowIndex % 2 === 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > headers.length) return;

      cell.border = cellBorder();
      cell.alignment = { vertical: "middle", wrapText: true };

      if (currencyColumns.includes(colNumber)) {
        cell.numFmt = '#,##0.00" ر.س"';
        cell.alignment = { ...cell.alignment, horizontal: "right" };
        if (typeof cell.value === "string" && cell.value !== "") {
          const n = Number(cell.value);
          if (!Number.isNaN(n)) cell.value = n;
        }
      } else if (dateColumns.includes(colNumber)) {
        cell.alignment = { ...cell.alignment, horizontal: "center" };
      } else if (typeof cell.value === "number") {
        cell.alignment = { ...cell.alignment, horizontal: "center" };
      } else {
        cell.alignment = { ...cell.alignment, horizontal: "right" };
      }

      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
      }
    });
  });

  autoColumnWidth(ws, headers);

  if (headers.length > 0 && rows.length > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}
