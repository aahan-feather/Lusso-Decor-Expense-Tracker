const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type ProjectType = "Quotation" | "Invoice";

export enum ProjectStatus {
  Running = "Running",
  Due = "Due",
  Closed = "Closed",
}

export type Project = {
  id: string;
  name: string;
  email: string | null;
  contactPerson1Name: string | null;
  contactPerson1Phone: string | null;
  contactPerson2Name: string | null;
  contactPerson2Phone: string | null;
  type: ProjectType | null;
  status: ProjectStatus | null;
  documentRef: string | null;
  details: string | null;
  invoiceAmount?: number | null;
  date: string | null;
  balance?: number;
};

export type LineItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  projectId: string;
  vendorId?: string | null;
  rate?: number | null;
  qty?: number | null;
  paymentMethodId?: string | null;
  createdAt?: string;
  project?: { id: string; name: string };
  vendor?: { id: string; name: string } | null;
  paymentMethod?: { id: string; name: string; type: string } | null;
};

export type ProjectPayment = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  projectId: string;
  paymentMethodId?: string | null;
  createdAt?: string;
  paymentMethod?: { id: string; name: string; type: string } | null;
};

export type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  balance?: number;
};

export type VendorItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendorId: string;
  lineItemId: string | null;
  lineItem?: { project?: { name: string } } | null;
};

export type VendorPaymentAllocation = {
  id: string;
  vendorPaymentId: string;
  vendorItemId: string;
  vendorItem: VendorItem;
};

export type VendorPayment = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  vendorId: string;
  paymentMethodId?: string | null;
  paymentMethod?: { id: string; name: string; type: string } | null;
  allocations?: VendorPaymentAllocation[];
};

export type DashboardData = {
  counts: { projects: number; vendors: number };
  totals: {
    totalBilled: number;
    totalReceived: number;
    totalVendorBill: number;
    totalPaidToVendors: number;
    outstandingFromProjects: number;
    outstandingToVendors: number;
  };
  recent: {
    projectPayments: (ProjectPayment & { project: { name: string } })[];
    vendorPayments: (VendorPayment & { vendor: { name: string } })[];
  };
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: string;
};

export type RegisterRowSourceType =
  | "project_payment"
  | "vendor_payment"
  | "office_expense"
  | "inventory_expense"
  | "line_item"
  | "bank_only";

export type RegisterRowMeta = {
  projectId?: string;
  vendorId?: string;
  officeExpenseId?: string;
  inventoryExpenseId?: string;
  lineItemId?: string;
};

export type RegisterRow = {
  sortAt: string;
  date: string;
  amount: number;
  direction: "in" | "out";
  label: string;
  sourceType: RegisterRowSourceType;
  sourceId: string;
  meta?: RegisterRowMeta;
  category?: string | null;
};

export type PaymentMethodRegisterResponse = {
  paymentMethod: PaymentMethod;
  rows: RegisterRow[];
};

export type BankOnlyTransaction = {
  id: string;
  paymentMethodId: string;
  date: string;
  amount: number;
  direction: string;
  description: string;
  category: string | null;
  createdAt: string;
};

export type OfficeExpenseType = {
  id: string;
  name: string;
  createdAt?: string;
};

export type OfficeExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethodId?: string | null;
  officeExpenseTypeId?: string | null;
  createdAt?: string;
  paymentMethod?: { id: string; name: string; type: string } | null;
  officeExpenseType?: { id: string; name: string } | null;
};

export type InventoryExpenseType = {
  id: string;
  name: string;
  createdAt?: string;
};

export type InventoryExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethodId?: string | null;
  inventoryExpenseTypeId?: string | null;
  createdAt?: string;
  paymentMethod?: { id: string; name: string; type: string } | null;
  inventoryExpenseType?: { id: string; name: string } | null;
};

export type ExpensesAndPaymentsProject = Project & {
  lineItems: LineItem[];
  projectPayments: ProjectPayment[];
};

export const api = {
  dashboard: () => request<DashboardData>("/dashboard"),

  expensesAndPayments: () => request<ExpensesAndPaymentsProject[]>("/expenses-and-payments"),

  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project & { lineItems: LineItem[]; projectPayments: ProjectPayment[]; balance: number }>(`/projects/${id}`),
    create: (data: { name: string; email?: string; contactPerson1Name?: string; contactPerson1Phone?: string; contactPerson2Name?: string; contactPerson2Phone?: string; type?: ProjectType | null; status?: ProjectStatus | null; documentRef?: string | null; details?: string | null; invoiceAmount?: number | null; date?: string | null }) =>
      request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Project, "name" | "email" | "contactPerson1Name" | "contactPerson1Phone" | "contactPerson2Name" | "contactPerson2Phone" | "type" | "status" | "documentRef" | "details" | "invoiceAmount" | "date">>) =>
      request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
    addLineItem: (
      projectId: string,
      data: {
        description: string;
        amount?: number;
        date?: string;
        vendorId?: string;
        rate?: number;
        qty?: number;
        paymentMethodId?: string | null;
      }
    ) =>
      request<LineItem>(`/projects/${projectId}/line-items`, { method: "POST", body: JSON.stringify(data) }),
    updateLineItem: (
      projectId: string,
      itemId: string,
      data: {
        description?: string;
        amount?: number;
        date?: string;
        vendorId?: string | null;
        rate?: number | null;
        qty?: number | null;
        paymentMethodId?: string | null;
      }
    ) =>
      request<LineItem>(`/projects/${projectId}/line-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteLineItem: (projectId: string, itemId: string) =>
      request<void>(`/projects/${projectId}/line-items/${itemId}`, { method: "DELETE" }),
    addPayment: (projectId: string, data: { amount: number; date?: string; note?: string; paymentMethodId?: string }) =>
      request<ProjectPayment>(`/projects/${projectId}/payments`, { method: "POST", body: JSON.stringify(data) }),
    updatePayment: (
      projectId: string,
      paymentId: string,
      data: { amount?: number; date?: string; note?: string | null; paymentMethodId?: string | null },
    ) =>
      request<ProjectPayment>(`/projects/${projectId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deletePayment: (projectId: string, paymentId: string) =>
      request<void>(`/projects/${projectId}/payments/${paymentId}`, { method: "DELETE" }),
  },

  lineItems: {
    list: (projectId?: string) =>
      request<LineItem[]>(projectId ? `/line-items?projectId=${projectId}` : "/line-items"),
  },

  vendors: {
    list: () => request<Vendor[]>("/vendors"),
    get: (id: string) =>
      request<
        Vendor & {
          vendorItems: VendorItem[];
          vendorPayments: VendorPayment[];
          balance: number;
        }
      >(`/vendors/${id}`),
    create: (data: { name: string; email?: string; phone?: string }) =>
      request<Vendor>("/vendors", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Vendor, "name" | "email" | "phone">>) =>
      request<Vendor>(`/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/vendors/${id}`, { method: "DELETE" }),
    addItem: (
      vendorId: string,
      data: { description: string; amount: number; date?: string; lineItemId?: string }
    ) =>
      request<VendorItem>(`/vendors/${vendorId}/items`, { method: "POST", body: JSON.stringify(data) }),
    updateItem: (
      vendorId: string,
      itemId: string,
      data: { description?: string; amount?: number; date?: string }
    ) =>
      request<VendorItem>(`/vendors/${vendorId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteItem: (vendorId: string, itemId: string) =>
      request<void>(`/vendors/${vendorId}/items/${itemId}`, { method: "DELETE" }),
    addPayment: (vendorId: string, data: { amount: number; date?: string; note?: string; paymentMethodId?: string; vendorItemIds?: string[] }) =>
      request<VendorPayment>(`/vendors/${vendorId}/payments`, { method: "POST", body: JSON.stringify(data) }),
    updatePayment: (
      vendorId: string,
      paymentId: string,
      data: { amount?: number; date?: string; note?: string | null; paymentMethodId?: string | null }
    ) =>
      request<VendorPayment>(`/vendors/${vendorId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deletePayment: (vendorId: string, paymentId: string) =>
      request<void>(`/vendors/${vendorId}/payments/${paymentId}`, { method: "DELETE" }),
  },

  officeExpenseTypes: {
    list: () => request<OfficeExpenseType[]>("/office-expense-types"),
    create: (data: { name: string }) =>
      request<OfficeExpenseType>("/office-expense-types", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name: string }) =>
      request<OfficeExpenseType>(`/office-expense-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  officeExpenses: {
    list: () => request<OfficeExpense[]>("/office-expenses"),
    create: (data: {
      description: string;
      amount: number;
      date?: string;
      paymentMethodId?: string | null;
      officeExpenseTypeId?: string | null;
    }) =>
      request<OfficeExpense>("/office-expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        description?: string;
        amount?: number;
        date?: string;
        paymentMethodId?: string | null;
        officeExpenseTypeId?: string | null;
      },
    ) =>
      request<OfficeExpense>(`/office-expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/office-expenses/${id}`, { method: "DELETE" }),
  },

  inventoryExpenseTypes: {
    list: () => request<InventoryExpenseType[]>("/inventory-expense-types"),
    create: (data: { name: string }) =>
      request<InventoryExpenseType>("/inventory-expense-types", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  inventoryExpenses: {
    list: () => request<InventoryExpense[]>("/inventory-expenses"),
    create: (data: {
      description: string;
      amount: number;
      date?: string;
      paymentMethodId?: string | null;
      inventoryExpenseTypeId?: string | null;
    }) =>
      request<InventoryExpense>("/inventory-expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        description?: string;
        amount?: number;
        date?: string;
        paymentMethodId?: string | null;
        inventoryExpenseTypeId?: string | null;
      },
    ) =>
      request<InventoryExpense>(`/inventory-expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/inventory-expenses/${id}`, { method: "DELETE" }),
  },

  paymentMethods: {
    list: () => request<PaymentMethod[]>("/payment-methods"),
    register: (id: string) =>
      request<PaymentMethodRegisterResponse>(`/payment-methods/${id}/register`),
    bankOnly: {
      create: (
        paymentMethodId: string,
        data: {
          amount: number;
          direction: "in" | "out";
          description: string;
          date?: string;
          category?: string | null;
        },
      ) =>
        request<BankOnlyTransaction>(
          `/payment-methods/${paymentMethodId}/bank-only`,
          { method: "POST", body: JSON.stringify(data) },
        ),
      update: (
        paymentMethodId: string,
        entryId: string,
        data: Partial<{
          amount: number;
          direction: "in" | "out";
          description: string;
          date: string;
          category: string | null;
        }>,
      ) =>
        request<BankOnlyTransaction>(
          `/payment-methods/${paymentMethodId}/bank-only/${entryId}`,
          { method: "PATCH", body: JSON.stringify(data) },
        ),
      delete: (paymentMethodId: string, entryId: string) =>
        request<void>(
          `/payment-methods/${paymentMethodId}/bank-only/${entryId}`,
          { method: "DELETE" },
        ),
    },
    create: (data: { name: string; type: string }) =>
      request<PaymentMethod>("/payment-methods", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; type?: string }) =>
      request<PaymentMethod>(`/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/payment-methods/${id}`, { method: "DELETE" }),
  },
};
