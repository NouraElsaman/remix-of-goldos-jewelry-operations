/**
 * Domain types shared across feature modules.
 * These describe the shape of the data; no business logic lives here.
 */

export type Karat = 24 | 22 | 21 | 18 | 14;

/** Where the daily rate originates. */
export type PriceSource = "manual" | "admin_override" | "mock" | "external_api";

export type UserRole = "owner" | "cashier" | "inventory_manager";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  password?: string;
};

export type GoldPrice = {
  date: string;
  karat: Karat;
  rate: number;
  rateBuy?: number | undefined;
  changePct?: number | undefined;
  source?: PriceSource | undefined;
  updatedBy?: string | undefined;
};

export type Tray = {
  id: string;
  name: string;
  location: string;
};

export type InventoryStatus = "in_stock" | "reserved" | "sold";

export type InventoryItem = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  karat: Karat;
  company?: string | null | undefined;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  manufacturingCost: number;
  trayId: string | null;
  status: InventoryStatus;
};

export type StockMovementType = "received" | "sold" | "returned" | "adjusted";

export type StockMovement = {
  id: string;
  itemId: string;
  type: StockMovementType;
  karat: Karat;
  weightDelta: number;
  at: string;
  by: string;
};

export type PaymentMethod = "cash" | "card" | "transfer" | "split";

export type Invoice = {
  id: string;
  number: string;
  cashierId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  transactionType?: "sale" | "purchase" | undefined;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  deductionPct?: number | undefined;
  idImageUrl?: string | undefined;
  karat?: number | undefined;
  weight?: number | undefined;
  handwork_value?: number | undefined;
  itemType?: string | undefined;
  itemId?: string | undefined;
  itemSku?: string | undefined;
  itemCompany?: string | undefined;
};

export type ReconciliationStatus = "open" | "closed";

export type ReconciliationRow = {
  karat: Karat;
  opening: number;
  received: number;
  sold: number;
  returned: number;
  adjusted: number;
  expected: number;
  counted: number | null;
  variance: number | null;
  status: ReconciliationStatus;
};
