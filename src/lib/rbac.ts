import type { UserRole } from "@/types/domain";

export type RouteAccess =
  | "/dashboard"
  | "/cashier"
  | "/inventory"
  | "/gold-prices"
  | "/reconciliation"
  | "/hedging"
  | "/reports"
  | "/analytics"
  | "/users"
  | "/settings";

export type Permission = "view" | "edit";

type RoutePermissions = {
  [K in RouteAccess]: {
    canView: boolean;
    canEdit: boolean;
  };
};

const ownerPermissions: RoutePermissions = {
  "/dashboard": { canView: true, canEdit: true },
  "/cashier": { canView: true, canEdit: true },
  "/inventory": { canView: true, canEdit: true },
  "/gold-prices": { canView: true, canEdit: true },
  "/reconciliation": { canView: true, canEdit: true },
  "/hedging": { canView: true, canEdit: true },
  "/reports": { canView: true, canEdit: true },
  "/analytics": { canView: true, canEdit: true },
  "/users": { canView: true, canEdit: true },
  "/settings": { canView: true, canEdit: true },
};

const cashierPermissions: RoutePermissions = {
  "/dashboard": { canView: true, canEdit: true },
  "/cashier": { canView: true, canEdit: true },
  "/inventory": { canView: true, canEdit: false },
  "/gold-prices": { canView: true, canEdit: false },
  "/reconciliation": { canView: false, canEdit: false },
  "/hedging": { canView: false, canEdit: false },
  "/reports": { canView: false, canEdit: false },
  "/analytics": { canView: false, canEdit: false },
  "/users": { canView: false, canEdit: false },
  "/settings": { canView: false, canEdit: false },
};

const inventoryManagerPermissions: RoutePermissions = {
  "/dashboard": { canView: true, canEdit: true },
  "/cashier": { canView: false, canEdit: false },
  "/inventory": { canView: true, canEdit: true },
  "/gold-prices": { canView: true, canEdit: false },
  "/reconciliation": { canView: true, canEdit: true },
  "/hedging": { canView: false, canEdit: false },
  "/reports": { canView: false, canEdit: false },
  "/analytics": { canView: false, canEdit: false },
  "/users": { canView: false, canEdit: false },
  "/settings": { canView: false, canEdit: false },
};

export const PermissionMatrix: Record<UserRole, RoutePermissions> = {
  owner: ownerPermissions,
  cashier: cashierPermissions,
  inventory_manager: inventoryManagerPermissions,
};

/**
 * Retrieves the current active role from storage.
 * This abstracts away localStorage so it can be replaced with JWT decoding later.
 */
export function getCurrentRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("goldos_user_role");
  if (role === "owner" || role === "cashier" || role === "inventory_manager") {
    return role as UserRole;
  }
  return null;
}

export function isOwner(): boolean {
  return getCurrentRole() === "owner";
}

export function isCashier(): boolean {
  return getCurrentRole() === "cashier";
}

export function isInventoryManager(): boolean {
  return getCurrentRole() === "inventory_manager";
}

export function canAccessRoute(
  role: UserRole | null,
  route: RouteAccess,
): boolean {
  if (typeof window === "undefined") return true;
  if (!role) return false;
  return PermissionMatrix[role][route].canView;
}

export function canView(role: UserRole | null, resource: RouteAccess): boolean {
  if (!role) return false;
  return PermissionMatrix[role][resource].canView;
}

export function canEdit(role: UserRole | null, resource: RouteAccess): boolean {
  if (!role) return false;
  return PermissionMatrix[role][resource].canEdit;
}
