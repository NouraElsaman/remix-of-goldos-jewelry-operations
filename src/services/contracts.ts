import type {
  GoldPrice,
  InventoryItem,
  Invoice,
  Karat,
  PriceSource,
  ReconciliationRow,
  AppUser,
} from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import type { ID, ListParams, Paginated } from "./types";

/** Everything the UI is allowed to ask for, expressed as plain interfaces. */

export type ActivityEventType =
  | "sale"
  | "purchase"
  | "inventory_change"
  | "price_update"
  | "reconciliation"
  | "user_action"
  | "system";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle?: string | undefined;
  /** ISO-8601 timestamp */
  at: string;
  /** Optional metadata badge label */
  meta?: string | undefined;
};

export type AlertSeverity =
  "info" | "success" | "warning" | "error" | "critical";

export type DashboardAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string | undefined;
  /** ISO-8601 timestamp */
  at: string;
  /** Call-to-action label */
  actionLabel?: string | undefined;
};

export type DashboardSummary = {
  revenueToday: number;
  purchasesToday: number;
  transactionsToday: number;
  inventoryValue: number;
  inventoryWeight: number;
  prices: GoldPrice[];
  recentActivity: ActivityEvent[];
  alerts: DashboardAlert[];
  isReconciliationClosed?: boolean;
  revenueChangePct?: number | null;
  purchasesChangePct?: number | null;
  transactionsChangeCount?: number | null;
};

export type AnalyticsSeriesPoint = { label: string; value: number };

export type AnalyticsSummary = {
  revenueTrend: AnalyticsSeriesPoint[];
  weightByKarat: AnalyticsSeriesPoint[];
};

/**
 * A report entry returned by ReportsService.available().
 * Both key fields are typed as TranslationKey so TypeScript prevents
 * referencing a key that does not exist in the dictionaries.
 */
export type ReportDescriptor = {
  id: ID;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export type ShopSettings = {
  // Store Information
  shopName: string;
  shopNameAr: string;
  ownerName: string;
  email: string;
  phone: string;
  commercialRegister: string;
  taxId: string;
  governorate: string;
  city: string;
  address: string;
  logoUrl?: string | null;
  currency: string;

  // Receipt Settings
  receiptHeader: string;
  receiptFooter: string;
  returnPolicy: string;

  // Pricing & Taxes
  vatRate: number;
  vatOnManufacturingOnly: boolean;
  defaultManufacturingCost: number;
  roundingMode: "none" | "nearest_pound" | "nearest_5_pounds";

  defaultKarat: Karat;
};

export type AuthSession = {
  user: AppUser;
  accessToken: string;
};

export interface AuthService {
  signIn(input: { email: string; password: string }): Promise<AuthSession>;
  signOut(): Promise<void>;
  currentUser(): Promise<AppUser | null>;
}

export interface DashboardService {
  summary(): Promise<DashboardSummary>;
}

/** Payload for setting a single karat price. */
export type SetPriceInput = {
  karat: Karat;
  rate: number;
  source?: PriceSource | undefined;
};

/** Payload for bulk setting all karat prices at once. */
export type SetAllPricesInput = {
  rates: Partial<Record<Karat, number>>;
  source?: PriceSource | undefined;
};

/**
 * Configuration used by the pricing engine to derive final item prices.
 * Stored per-shop in Settings; never hardcoded in UI components.
 */
export type PricingConfig = {
  vatRate: number;
  stampingFee: number;
  /** Additional shop margin on top of gold rate (absolute SAR/g). */
  shopMargin: number;
};

/**
 * Result of the pricing engine computing a price for one inventory item.
 * Consumed by Cashier, Reports, and AI Monitoring.
 */
export type ComputedItemPrice = {
  goldValue: number;
  manufacturingCost: number;
  stampingFee: number;
  subtotal: number;
  vatAmount: number;
  total: number;
};

export interface GoldPriceService {
  today(): Promise<GoldPrice[]>;
  history(params?: ListParams): Promise<Paginated<GoldPrice>>;
  setPrice(input: SetPriceInput): Promise<GoldPrice>;
  setMultiple(input: SetAllPricesInput): Promise<GoldPrice[]>;
}

export interface InventoryService {
  list(params?: ListParams): Promise<Paginated<InventoryItem>>;
  byId(id: ID): Promise<InventoryItem | null>;
  createItem(input: Omit<InventoryItem, "id" | "barcode" | "status">): Promise<InventoryItem>;
}

export interface SalesService {
  listInvoices(params?: ListParams): Promise<Paginated<Invoice>>;
  createInvoice(input: Omit<Invoice, "id" | "createdAt" | "number">): Promise<Invoice>;
}

export interface ReconciliationService {
  currentDay(): Promise<ReconciliationRow[]>;
  submitCounted(karat: number, counted: number): Promise<void>;
  reopenToday(): Promise<void>;
  updateOpeningWeights(inputs: { karat: number; weight: number }[]): Promise<void>;
}

export interface ReportsService {
  available(): Promise<ReportDescriptor[]>;
}

export interface AnalyticsService {
  summary(): Promise<AnalyticsSummary>;
}

export interface UsersService {
  list(params?: ListParams): Promise<Paginated<AppUser>>;
}

export interface SettingsService {
  get(): Promise<ShopSettings>;
  update(input: Partial<ShopSettings>): Promise<ShopSettings>;
}

/** The single object the UI consumes. Swap the implementation, not the UI. */
export interface ServiceRegistry {
  auth: AuthService;
  dashboard: DashboardService;
  goldPrices: GoldPriceService;
  inventory: InventoryService;
  sales: SalesService;
  reconciliation: ReconciliationService;
  reports: ReportsService;
  analytics: AnalyticsService;
  users: UsersService;
  settings: SettingsService;
}
