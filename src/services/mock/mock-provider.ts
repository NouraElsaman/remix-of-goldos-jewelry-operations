import type { ListParams, Paginated } from "../types";
import type { ServiceRegistry } from "../contracts";
import {
  mockGoldPrices,
  mockGoldPriceHistory,
  mockInventory,
  mockInvoices,
  mockReconciliation,
  mockUsers,
  mockActivity,
  mockAlerts,
} from "./fixtures";

/** Simulated latency keeps loading states honest during design review. */
const LATENCY_MS = 240;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function paginate<T>(items: T[], params?: ListParams): Paginated<T> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

/** In-memory provider used until the FastAPI backend exists. */
export const mockServices: ServiceRegistry = {
  auth: {
    signIn: async () =>
      delay({ user: mockUsers[0]!, accessToken: "mock.jwt.token" }),
    signOut: async () => delay(undefined),
    currentUser: async () => delay(mockUsers[0]!),
  },
  dashboard: {
    summary: async () =>
      delay({
        revenueToday: 236_400,
        purchasesToday: 112_000,
        transactionsToday: 14,
        inventoryValue: 24_850_000,
        inventoryWeight: 2_406.47,
        prices: mockGoldPrices,
        recentActivity: mockActivity,
        alerts: mockAlerts,
        revenueChangePct: 4.2,
        purchasesChangePct: 1.8,
        transactionsChangeCount: 2,
      }),
  },
  goldPrices: {
    today: async () => delay(mockGoldPrices),
    history: async (params) => delay(paginate(mockGoldPriceHistory, params)),
    setPrice: async (input) =>
      delay({
        date: new Date().toISOString().slice(0, 10),
        karat: input.karat,
        rate: input.rate,
        source: input.source ?? "manual",
      }),
    setMultiple: async (input) =>
      delay(
        Object.entries(input.rates).map(([karat, rate]) => ({
          date: new Date().toISOString().slice(0, 10),
          karat: Number(karat) as import("@/types/domain").Karat,
          rate: rate as number,
          source: input.source ?? "manual",
        })),
      ),
  },
  inventory: {
    list: async (params) => delay(paginate(mockInventory, params)),
    byId: async (id) =>
      delay(mockInventory.find((item) => item.id === id) ?? null),
    createItem: async (input) => {
      const newItem = {
        ...input,
        id: `itm_${Math.random()}`,
        barcode: `628100000${Math.floor(1000 + Math.random() * 9000)}`,
        status: "in_stock" as const,
      };
      mockInventory.push(newItem);
      return delay(newItem);
    },
    updateItem: async (id, input) => {
      const index = mockInventory.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInventory[index] = { ...mockInventory[index], ...input };
        return delay(mockInventory[index]);
      }
      throw new Error("Item not found");
    },
    deleteItem: async (id) => {
      const index = mockInventory.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInventory.splice(index, 1);
      }
      return delay(undefined);
    },
  },
  sales: {
    listInvoices: async (params) => delay(paginate(mockInvoices, params)),
    createInvoice: async (input) =>
      delay({
        id: Math.random().toString(36).substring(7),
        number: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...input,
      }),
  },
  reconciliation: {
    currentDay: async () => delay(mockReconciliation),
    submitCounted: async (karat, counted) => {
      const row = mockReconciliation.find((r) => r.karat === karat);
      if (row) {
        row.counted = counted;
        row.variance = counted - row.expected;
        row.status = "closed";
      }
    },
    reopenToday: async () => {
      mockReconciliation.forEach((r) => {
        r.status = "open";
        r.counted = null;
        r.variance = null;
      });
    },
    updateOpeningWeights: async (inputs) => {
      inputs.forEach((input) => {
        const row = mockReconciliation.find((r) => r.karat === input.karat);
        if (row) {
          row.opening = input.weight;
          row.expected = input.weight + row.received - row.sold;
        }
      });
    },
  },
  reports: {
    available: async () =>
      delay([
        {
          id: "daily-sales",
          titleKey: "reports.daily",
          descriptionKey: "reports.dailyBody",
        },
        {
          id: "stock-value",
          titleKey: "reports.stock",
          descriptionKey: "reports.stockBody",
        },
        {
          id: "vat",
          titleKey: "reports.vat",
          descriptionKey: "reports.vatBody",
        },
      ]),
  },
  analytics: {
    summary: async () =>
      delay({
        revenueTrend: [
          { label: "Mon", value: 5200 },
          { label: "Tue", value: 6100 },
          { label: "Wed", value: 4800 },
          { label: "Thu", value: 7400 },
          { label: "Fri", value: 8100 },
          { label: "Sat", value: 6900 },
          { label: "Sun", value: 6784 },
        ],
        weightByKarat: [
          { label: "24K", value: 180.4 },
          { label: "21K", value: 964.21 },
          { label: "18K", value: 320.6 },
        ],
        inventoryWeightByKarat: [
          { label: "24K", value: 500.0 },
          { label: "21K", value: 1200.0 },
          { label: "18K", value: 850.0 },
        ],
      }),
  },
  users: {
    list: async (params) => delay(paginate(mockUsers, params)),
  },
  settings: {
    get: async () => delay({ ...defaultSettings }),
    update: async (input) => delay({ ...defaultSettings, ...input }),
  },
};

const defaultSettings = {
  shopName: "Al Asala Jewelry",
  shopNameAr: "مجوهرات الأصالة",
  ownerName: "Ahmed Mostafa",
  email: "contact@alasala.eg",
  phone: "01012345678",
  commercialRegister: "123456789",
  taxId: "123456789",
  governorate: "Cairo",
  city: "Heliopolis",
  address: "15 El Korba St",
  logoUrl: null,
  currency: "EGP",
  receiptHeader: "Welcome to Al Asala Jewelry",
  receiptFooter: "Thank you for your visit!",
  returnPolicy: "Returns within 14 days with original receipt.",
  vatRate: 0.14,
  vatOnManufacturingOnly: true,
  defaultManufacturingCost: 150,
  roundingMode: "nearest_5_pounds" as const,
  defaultKarat: 21 as const,
};
