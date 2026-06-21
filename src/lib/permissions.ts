/** مشرف موقع / مهندس مشروع — واجهة ميدانية بدون بيانات مالية حساسة */
export function isFieldRole(role: string): boolean {
  return role === "site_supervisor" || role === "project_engineer";
}

export function canViewFinancialData(role: string): boolean {
  return !isFieldRole(role);
}

export function canViewProjectsModule(role: string): boolean {
  return role === "admin" || role === "project_manager" || role === "site_supervisor" || role === "project_engineer" || role === "accountant";
}

export function canPickProject(role: string): boolean {
  return canViewProjectsModule(role) || role === "accountant";
}

export function canViewExtracts(role: string): boolean {
  return role === "admin" || role === "project_manager" || role === "project_engineer" || role === "accountant";
}

export function canViewContracts(role: string): boolean {
  return role === "admin" || role === "project_manager" || role === "accountant";
}

export function canViewReports(role: string): boolean {
  return role === "admin" || role === "accountant" || role === "project_manager";
}

export function canPrintExpensePdf(role: string): boolean {
  return role === "admin" || role === "accountant" || role === "project_manager";
}

export function canExportReportPdf(role: string): boolean {
  return canViewReports(role);
}

export function canCreate(role: string, resource: string): boolean {
  const map: Record<string, string[]> = {
    projects: ["admin"],
    projectItems: ["admin"],
    catalogItems: ["admin", "project_manager"],
    expenses: ["admin", "project_manager", "site_supervisor", "project_engineer"],
    pettyCash: ["admin", "accountant"],
    pettyCashUse: ["project_manager", "site_supervisor", "project_engineer"],
    extracts: ["admin", "project_manager", "project_engineer"],
    contractors: ["admin", "project_manager"],
    suppliers: ["admin", "project_manager"],
    purchases: ["admin", "project_manager"],
    users: ["admin"],
  };
  return map[resource]?.includes(role) ?? false;
}

export function canEdit(role: string, resource: string): boolean {
  const map: Record<string, string[]> = {
    projects: ["admin"],
    projectItems: ["admin"],
    catalogItems: ["admin", "project_manager"],
    expenses: ["admin", "project_manager"],
    pettyCash: ["admin", "accountant"],
    extracts: ["admin", "project_manager", "project_engineer"],
    contractors: ["admin", "project_manager"],
    suppliers: ["admin", "project_manager"],
    purchases: ["admin", "project_manager"],
    users: ["admin"],
  };
  return map[resource]?.includes(role) ?? false;
}

export function canDelete(role: string): boolean {
  return role === "admin";
}

export function canManagerApproveExpense(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

export function canAccountantApproveExpense(role: string): boolean {
  return role === "admin" || role === "accountant";
}

export function canSettlePettyCash(role: string): boolean {
  return role === "admin" || role === "accountant";
}

export function canUsePettyCash(role: string): boolean {
  return role === "admin" || role === "project_manager" || role === "site_supervisor" || role === "project_engineer";
}

export function canApproveExtractManager(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

export function canApproveExtractAccountant(role: string): boolean {
  return role === "admin" || role === "accountant";
}

export function canExportPdf(role: string): boolean {
  return canExportReportPdf(role);
}

export function canCreateTask(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

export function canViewTasks(role: string): boolean {
  return ["admin", "project_manager", "accountant", "site_supervisor", "project_engineer"].includes(role);
}

/** أدوار يمكن إسناد العهد لهم */
export const PETTY_CASH_RECIPIENT_ROLES = ["project_manager", "site_supervisor", "project_engineer"];
