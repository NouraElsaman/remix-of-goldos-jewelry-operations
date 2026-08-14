/**
 * HTTP service provider — FastAPI implementation.
 *
 * Each method maps to a FastAPI endpoint. Implement the body when the
 * corresponding endpoint is ready; the interface enforced by ServiceRegistry
 * guarantees that the UI never needs changing.
 *
 * URL convention (matches the FastAPI router prefix plan):
 *   POST   /auth/login
 *   POST   /auth/logout
 *   GET    /auth/me
 *   GET    /dashboard/summary
 *   GET    /gold-prices/today
 *   GET    /gold-prices/history?page=&page_size=
 *   POST   /gold-prices
 *   GET    /inventory?page=&page_size=&search=
 *   GET    /inventory/{id}
 *   GET    /sales/invoices?page=&page_size=
 *   GET    /reconciliation/current-day
 *   GET    /reports
 *   GET    /analytics/summary
 *   GET    /users?page=&page_size=
 *   GET    /settings
 *   PATCH  /settings
 */

import { apiRequest } from "./api-client";
import type {
  ServiceRegistry,
  DashboardSummary,
  AnalyticsSummary,
  ReportDescriptor,
  ShopSettings,
  AuthSession,
} from "../contracts";
import type {
  GoldPrice,
  InventoryItem,
  Invoice,
  ReconciliationRow,
  AppUser,
} from "@/types/domain";
import type { ListParams, Paginated } from "../types";

/** Converts ListParams to a FastAPI-compatible query object. */
function toQuery(params?: ListParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const q: Record<string, unknown> = {};
  if (params.page !== undefined) q["page"] = params.page;
  if (params.pageSize !== undefined) q["page_size"] = params.pageSize;
  if (params.search) q["search"] = params.search;
  if (params.sort) q["sort"] = params.sort;
  if (params.order) q["order"] = params.order;
  if (params.filters) Object.assign(q, params.filters);
  return q;
}

export const httpServices: ServiceRegistry = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    signIn: (input) =>
      apiRequest<AuthSession>("/auth/login", { method: "POST", body: input }),

    signOut: () => apiRequest<void>("/auth/logout", { method: "POST" }),

    currentUser: () => apiRequest<AppUser | null>("/auth/me"),
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    summary: () => apiRequest<DashboardSummary>("/dashboard/summary"),
  },

  // ── Gold Prices ───────────────────────────────────────────────────────────
  goldPrices: {
    today: () => apiRequest<GoldPrice[]>("/gold-prices/today"),

    history: (params) =>
      apiRequest<Paginated<GoldPrice>>("/gold-prices/history", {
        query: toQuery(params),
      }),

    setPrice: (input) =>
      apiRequest<GoldPrice>("/gold-prices", { method: "POST", body: input }),

    setMultiple: (input) =>
      apiRequest<GoldPrice[]>("/gold-prices/bulk", {
        method: "POST",
        body: input,
      }),
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    list: (params) =>
      apiRequest<Paginated<InventoryItem>>("/inventory", {
        query: toQuery(params),
      }),

    byId: (id) => apiRequest<InventoryItem | null>(`/inventory/${id}`),

    createItem: (input) =>
      apiRequest<InventoryItem>("/inventory", { method: "POST", body: input }),
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  sales: {
    listInvoices: (params) =>
      apiRequest<Paginated<Invoice>>("/sales/invoices", {
        query: toQuery(params),
      }),
    createInvoice: (input) =>
      apiRequest<Invoice>("/sales/invoices", {
        method: "POST",
        body: input,
      }),
  },

  // ── Reconciliation ────────────────────────────────────────────────────────
  reconciliation: {
    currentDay: () =>
      apiRequest<ReconciliationRow[]>("/reconciliation/current-day"),

    submitCounted: (karat, counted) =>
      apiRequest<void>("/reconciliation/counted", {
        method: "POST",
        body: { karat, counted },
      }),

    reopenToday: () =>
      apiRequest<void>("/reconciliation/reopen", { method: "POST" }),

    updateOpeningWeights: (inputs) =>
      apiRequest<void>("/reconciliation/opening-weights", {
        method: "POST",
        body: inputs,
      }),
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    available: () => apiRequest<ReportDescriptor[]>("/reports"),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    summary: () => apiRequest<AnalyticsSummary>("/analytics/summary"),
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    list: (params) =>
      apiRequest<Paginated<AppUser>>("/users", { query: toQuery(params) }),
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: () => apiRequest<ShopSettings>("/settings"),

    update: (input) =>
      apiRequest<ShopSettings>("/settings", { method: "PATCH", body: input }),
  },
};
