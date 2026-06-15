const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tahil-api-lemon.vercel.app";

export { API_URL as API_BASE_URL };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FetchOptions = RequestInit & { token?: string | null; retries?: number; timeoutMs?: number };

async function fetchWithRetry(url: string, init: RequestInit, retries = 3, timeoutMs = 45000): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if ((res.status >= 500 || res.status === 429) && attempt < retries - 1) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries - 1) await sleep(800 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("فشل الاتصال بالخادم");
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, retries = 3, timeoutMs = 45000, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchWithRetry(`${API_URL}${path}`, { ...init, headers, credentials: "include" }, retries, timeoutMs);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "خطأ في الاتصال" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function crud<T>(base: string, token: string) {
  return {
    list: () => apiFetch<T[]>(base, { token }),
    get: (id: number) => apiFetch<T>(`${base}/${id}`, { token }),
    create: (body: unknown) => apiFetch<T>(base, { method: "POST", token, body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => apiFetch<T>(`${base}/${id}`, { method: "PUT", token, body: JSON.stringify(body) }),
    patch: (id: number, body: unknown) => apiFetch<T>(`${base}/${id}`, { method: "PATCH", token, body: JSON.stringify(body) }),
    remove: (id: number) => apiFetch(`${base}/${id}`, { method: "DELETE", token }),
  };
}

export type User = {
  id: number; name: string; email: string; username: string | null;
  role: string; department: string | null; assignedProjectId: number | null; assignedProjectIds: number[];
};

export type Project = {
  id: number; name: string; description: string | null; client: string;
  location: string | null; status: string; startDate: string | null; endDate: string | null;
  contractValue: number; budgetAllocated: number; totalExpenses: number; totalExtracts: number; progressPercent: number;
};

export type ProjectItem = {
  id: number; projectId: number; catalogItemId?: number | null; itemCode?: string | null;
  name: string; unit: string;
  unitPrice: number; estimatedPrice: number; executedPrice: number; quantity: number;
  totalEstimated: number; totalExecuted: number; variance: number;
};

export type CatalogItem = {
  id: number; code?: string | null; name: string; unit: string;
  defaultUnitPrice: number; defaultEstimatedPrice: number;
  category?: string | null; isActive: boolean; notes?: string | null;
};

export type Expense = {
  id: number; projectId: number; projectName?: string; title: string; amount: number;
  category: string; type?: string; status: string; submittedBy: string; submittedById?: number;
  contractorId?: number; projectItemId?: number;
  expenseDate: string; attachmentUrl?: string; description?: string;
  managerApprovedBy?: string; accountantApprovedBy?: string; rejectionReason?: string;
};

export type PettyCash = {
  id: number; projectId: number | null; projectName?: string; assignedTo: string;
  assignedToId: number; purpose: string; allocatedAmount: number; usedAmount: number;
  remaining?: number; status: string; issuedDate: string; notes?: string;
};

export type Extract = {
  id: number; projectId: number; projectName?: string; contractorId?: number;
  contractorName?: string; extractNumber: string; title: string; amount: number;
  status: string; extractDate: string; notes?: string;
};

export type ExtractLine = {
  id?: number; contractItemId?: number; projectItemId?: number;
  description: string; unit: string; quantity: number; unitPrice: number; amount?: number;
};

export type SmartExtractItem = {
  contractItemId: number; projectItemId?: number; itemCode?: string;
  description: string; unit: string; contractType: string;
  contractedQuantity: number; previousQuantity: number; remainingQuantity: number; unitPrice: number;
};

export type Contractor = {
  id: number; name: string; companyName?: string; phone?: string; email?: string;
  specialty?: string; licenseNumber?: string; vatNumber?: string; address?: string;
  status: string; notes?: string; totalContractValue?: number; totalPaid?: number;
};

export type Supplier = {
  id: number; name: string; companyName?: string; phone?: string; category?: string; status: string;
};

export type Purchase = {
  id: number; supplierId: number; supplierName?: string; projectId: number; projectName?: string;
  purchaseNumber: string; title: string; amount: number; paidAmount: number;
  status: string; paymentStatus: string; orderDate: string;
};

export type UserRow = {
  id: number; name: string; email: string; username: string | null;
  role: string; department: string | null; isActive: boolean;
};

export type ExpenseCategory = { id: number; name: string };

export type DashboardStats = {
  totalProjects: number; activeProjects: number; delayedProjects?: number;
  totalContractValue: number; totalExpenses: number; totalExtracts: number;
  totalPurchases?: number; totalCosts?: number; expectedProfit?: number; actualProfit?: number;
  totalPettyCashOpen: number; pendingExpensesCount: number; pendingExtractsCount: number;
  overallProfitMargin: number; myTasksCount?: number;
  topProjects: Array<{ projectId: number; projectName: string; contractValue: number; progressPercent: number; totalExpenses?: number; totalCosts?: number; profitMargin?: number }>;
  topProfitableItems?: Array<{ name: string; profit: number }>;
  topLossItems?: Array<{ name: string; profit: number }>;
  recentExpenses?: Array<{ id: number; title: string; amount: number; status: string; expenseDate: string }>;
  recentExtracts?: Array<{ id: number; title: string; amount: number; status: string }>;
};

export type Task = {
  id: number; title: string; description?: string; projectId?: number; projectName?: string;
  contractorId?: number; contractorName?: string; assigneeId: number; assigneeName?: string;
  createdById: number; createdByName?: string; priority: string; status: string;
  startDate?: string; dueDate?: string; source: string;
};

export type Contract = {
  id: number; projectId: number; projectName?: string; contractorId: number; contractorName?: string;
  contractType: string; title: string; totalValue: number; expectedProfit?: number; itemsCount?: number; status: string;
};

export type ContractItem = {
  id: number; contractId?: number; contractorId: number; contractorName?: string; projectId: number;
  projectName?: string; projectItemId?: number; contractType: string; itemCode?: string | null;
  description: string; unit: string; quantity: number; unitPrice: number; companyUnitCost: number;
  totalValue: number; expectedProfit: number; profitPercent: number; completedQuantity: number;
  remainingQuantity: number; progressPercent: number; status: string; notes?: string | null;
};

export type NotificationItem = {
  id: number; title: string; message: string; type: string; link?: string; isRead: boolean; createdAt: string;
};

export type FinancialReport = {
  filters: { projectId: number | null; projectName: string | null; scope: "all" | "project" };
  summary: {
    totalRevenue: number; totalExpenses: number; totalProfit: number; profitMargin: number;
    totalExtracts: number; totalPurchases: number; approvedExpensesOnly: number;
  };
  monthlyCashFlow: Array<{ month: number; monthLabel: string; revenue: number; expenses: number }>;
  expensesByCategory: Array<{ category: string; amount: number; percent: number; color: string }>;
  projects: Array<{
    id: number; name: string; client: string; status: string; contractValue: number;
    expenses: number; extracts: number; purchases: number; totalCosts: number;
    profit: number; profitMargin: number; progressPercent: number;
  }>;
  contractors: Array<{ id: number; name: string; contractValue: number; paid: number; remaining: number }>;
  suppliers: Array<{ id: number; name: string; category: string | null; purchases: number; paid: number; remaining: number }>;
  expenseRows: Array<{
    id: number; title: string; amount: number; category: string; status: string;
    projectName: string; expenseDate: string; submittedBy: string;
  }>;
  extractRows: Array<{
    id: number; title: string; amount: number; status: string; projectName: string;
    contractorName: string; extractDate: string; extractNumber: string;
  }>;
  purchaseRows: Array<{
    id: number; title: string; amount: number; paidAmount: number; status: string;
    projectName: string; supplierName: string; orderDate: string; purchaseNumber: string;
  }>;
  pettyCashByEmployee: Array<{ userId: number; name: string; count: number; allocated: number; used: number; remaining: number }>;
  pettyCashSummary: { totalAllocated: number; totalUsed: number; totalRemaining: number; transactionCount: number };
  projectsList: Array<{ id: number; name: string }>;
};

export const api = {
  login: (u: string, p: string) => apiFetch<User & { token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
  logout: (token: string) => apiFetch("/api/auth/logout", { method: "POST", token }),
  me: (token: string) => apiFetch<User>("/api/auth/me", { token }),
  dashboard: (token: string) => apiFetch<DashboardStats>("/api/reports/dashboard", { token }),
  reports: {
    financial: (token: string, projectId?: number | "all") => {
      const q = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
      return apiFetch<FinancialReport>(`/api/reports/financial${q}`, { token, timeoutMs: 60000 });
    },
  },
  expenseCategories: (token: string) => apiFetch<ExpenseCategory[]>("/api/expense-categories", { token }),
  upload: async (token: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string; filename: string }>("/api/upload", { method: "POST", token, body: fd });
  },
  projects: (token: string) => crud<Project>("/api/projects", token),
  projectItems: (token: string, projectId: number) => ({
    list: () => apiFetch<ProjectItem[]>(`/api/project-items?projectId=${projectId}`, { token }),
    create: (body: unknown) => apiFetch<ProjectItem>("/api/project-items", { method: "POST", token, body: JSON.stringify({ ...body as object, projectId }) }),
    update: (id: number, body: unknown) => apiFetch(`/api/project-items/${id}`, { method: "PUT", token, body: JSON.stringify(body) }),
    remove: (id: number) => apiFetch(`/api/project-items/${id}`, { method: "DELETE", token }),
    importExcel: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", String(projectId));
      return apiFetch<{ inserted: number }>("/api/project-items/import", { method: "POST", token, body: fd });
    },
  }),
  expenses: (token: string) => crud<Expense>("/api/expenses", token),
  pettyCash: (token: string) => ({
    ...crud<PettyCash>("/api/petty-cash", token),
    use: (id: number, amount: number, projectId?: number) =>
      apiFetch(`/api/petty-cash/${id}`, { method: "PATCH", token, body: JSON.stringify({ action: "use", amount, projectId }) }),
    settle: (id: number, usedAmount?: number) =>
      apiFetch(`/api/petty-cash/${id}`, { method: "PATCH", token, body: JSON.stringify({ action: "settle", usedAmount }) }),
  }),
  extracts: (token: string) => ({
    ...crud<Extract>("/api/extracts", token),
    lines: (id: number) => apiFetch<ExtractLine[]>(`/api/extracts/${id}/lines`, { token }),
    saveLines: (id: number, lines: ExtractLine[]) => apiFetch<{ total: number }>(`/api/extracts/${id}/lines`, { method: "POST", token, body: JSON.stringify({ lines }) }),
    smartItems: (projectId: number, contractorId: number, excludeExtractId?: number) => {
      const q = new URLSearchParams({ projectId: String(projectId), contractorId: String(contractorId) });
      if (excludeExtractId) q.set("excludeExtractId", String(excludeExtractId));
      return apiFetch<SmartExtractItem[]>(`/api/extracts/smart-items?${q}`, { token });
    },
  }),
  contractors: (token: string) => crud<Contractor>("/api/contractors", token),
  catalogItems: (token: string) => ({
    ...crud<CatalogItem>("/api/catalog-items", token),
    list: (params?: { active?: boolean }) => {
      const q = params?.active ? "?active=true" : "";
      return apiFetch<CatalogItem[]>(`/api/catalog-items${q}`, { token });
    },
  }),
  suppliers: (token: string) => crud<Supplier>("/api/suppliers", token),
  purchases: (token: string) => crud<Purchase>("/api/purchases", token),
  users: (token: string) => crud<UserRow>("/api/users", token),
  assignableUsers: (token: string) => apiFetch<Array<{ id: number; name: string; role: string; isActive: boolean }>>("/api/users/assignable", { token }),
  tasks: (token: string) => ({
    ...crud<Task>("/api/tasks", token),
    automate: () => apiFetch<{ created: number }>("/api/tasks/automate", { method: "POST", token }),
  }),
  notifications: (token: string) => ({
    list: (unread?: boolean) => apiFetch<{ items: NotificationItem[]; unreadCount: number }>(`/api/notifications${unread ? "?unread=true" : ""}`, { token }),
    markRead: (id: number) => apiFetch("/api/notifications", { method: "PATCH", token, body: JSON.stringify({ id }) }),
    markAllRead: () => apiFetch("/api/notifications", { method: "PATCH", token, body: JSON.stringify({ markAllRead: true }) }),
  }),
  contracts: (token: string) => ({
    ...crud<Contract>("/api/contracts", token),
    detail: (id: number) => apiFetch<Contract & { items: ContractItem[] }>(`/api/contracts/${id}`, { token }),
  }),
  contractItems: (token: string) => ({
    list: (params?: { contractorId?: number; projectId?: number }) => {
      const q = new URLSearchParams();
      if (params?.contractorId) q.set("contractorId", String(params.contractorId));
      if (params?.projectId) q.set("projectId", String(params.projectId));
      return apiFetch<ContractItem[]>(`/api/contract-items?${q}`, { token });
    },
    create: (body: unknown) => apiFetch<ContractItem>("/api/contract-items", { method: "POST", token, body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => apiFetch(`/api/contract-items/${id}`, { method: "PUT", token, body: JSON.stringify(body) }),
    remove: (id: number) => apiFetch(`/api/contract-items/${id}`, { method: "DELETE", token }),
  }),
};

export const uploadsUrl = (path: string) => `${API_URL}${path}`;
