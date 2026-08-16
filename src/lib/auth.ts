import type { AppUser, UserRole } from "@/types/domain";

export const DEFAULT_USERS: AppUser[] = [
  {
    id: "usr_owner",
    name: "نورة الهلالي (المالك)",
    email: "nourahelaly56@gmail.com",
    role: "owner",
    active: true,
    password: "12345",
  },
  {
    id: "usr_cashier",
    name: "نورة حمدان (كاشير)",
    email: "cashier@alasala.sa",
    role: "cashier",
    active: true,
    password: "12345",
  },
  {
    id: "usr_stock",
    name: "طارق صالح (مسؤول مخزون)",
    email: "stock@alasala.sa",
    role: "inventory_manager",
    active: true,
    password: "12345",
  },
];

/**
 * Retrieves the registered users list from local storage, fallback to default users.
 */
export function getRegisteredUsers(): AppUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;

  const saved = localStorage.getItem("goldos_users_list");
  if (!saved) {
    localStorage.setItem("goldos_users_list", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  try {
    const parsed: AppUser[] = JSON.parse(saved);
    // Ensure the main owner account exists
    const hasOwner = parsed.some(
      (u) => u.email.toLowerCase() === "nourahelaly56@gmail.com",
    );
    if (!hasOwner) {
      const merged = [DEFAULT_USERS[0]!, ...parsed];
      localStorage.setItem("goldos_users_list", JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem("goldos_users_list", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
}

/**
 * Authenticate credentials against registered users list.
 */
export function authenticateUser(
  emailInput: string,
  passwordInput: string,
): { user: AppUser; role: UserRole } | null {
  const users = getRegisteredUsers();
  const normalizedEmail = emailInput.trim().toLowerCase();

  const user = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.active,
  );

  if (!user) return null;

  const validPassword = user.password || "12345";
  if (passwordInput === validPassword) {
    return { user, role: user.role };
  }

  return null;
}

/**
 * Returns the default home route for a given user role.
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "owner":
      return "/dashboard";
    case "cashier":
      return "/cashier";
    case "inventory_manager":
      return "/inventory";
    default:
      return "/dashboard";
  }
}

/**
 * Reads the current authentication token.
 */
export function isAuthenticated(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("goldos_auth_token"))
  );
}

export { getCurrentRole } from "./rbac";
