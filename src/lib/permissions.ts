export function canCreate(role: string, resource: string): boolean {
  const map: Record<string, string[]> = {
    projects: ["admin"],
    projectItems: ["admin"],
    catalogItems: ["admin", "project_manager"],
    expenses: ["admin", "project_manager", "site_supervisor"],
    pettyCash: ["admin", "accountant"],
    pettyCashUse: ["project_manager", "site_supervisor"],
    extracts: ["admin", "project_manager"],
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
    extracts: ["admin", "project_manager"],
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
  return role === "admin" || role === "project_manager" || role === "site_supervisor";
}

export function canApproveExtractManager(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

export function canApproveExtractAccountant(role: string): boolean {
  return role === "admin" || role === "accountant";
}

export function canExportPdf(role: string): boolean {
  return role === "admin" || role === "accountant";
}

export function canCreateTask(role: string): boolean {
  return role === "admin" || role === "project_manager";
}

export function canViewTasks(role: string): boolean {
  return ["admin", "project_manager", "accountant", "site_supervisor"].includes(role);
}
