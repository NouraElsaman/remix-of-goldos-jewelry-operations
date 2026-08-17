import { supabase } from "@/services/supabase/supabase-provider";
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
];

const MOCK_EMAILS_TO_REMOVE = new Set([
  "owner@alasala.sa",
  "cashier@alasala.sa",
  "stock@alasala.sa",
]);

/**
 * Syncs and retrieves registered users list from Supabase + local cache.
 */
export async function fetchRegisteredUsersAsync(): Promise<AppUser[]> {
  try {
    const { data, error } = await supabase.from("app_users").select("*");
    if (!error && data && data.length > 0) {
      const users: AppUser[] = data.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        active: Boolean(u.active),
        password: u.password,
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem("goldos_users_list", JSON.stringify(users));
      }
      return users;
    }
  } catch (e) {
    // console.warn("Supabase fetch users fallback to local cache:", e);
  }

  return getRegisteredUsers();
}

/**
 * Synchronous local storage retrieval helper
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
    const filtered = parsed.filter(
      (u) => !MOCK_EMAILS_TO_REMOVE.has(u.email.toLowerCase()),
    );

    const hasOwner = filtered.some(
      (u) => u.email.toLowerCase() === "nourahelaly56@gmail.com",
    );
    const finalUsers = hasOwner ? filtered : [DEFAULT_USERS[0]!, ...filtered];

    localStorage.setItem("goldos_users_list", JSON.stringify(finalUsers));
    return finalUsers;
  } catch (e) {
    localStorage.setItem("goldos_users_list", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
}

/**
 * Registers a new user both in local storage and in Supabase database.
 */
export async function registerNewUser(newUser: AppUser): Promise<void> {
  // 1. Update local storage
  const current = getRegisteredUsers();
  const next = [...current.filter((u) => u.id !== newUser.id), newUser];
  if (typeof window !== "undefined") {
    localStorage.setItem("goldos_users_list", JSON.stringify(next));
  }

  // 2. Upsert into Supabase app_users table for multi-device sync
  try {
    await supabase.from("app_users").upsert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      password: newUser.password || "12345",
      active: newUser.active ?? true,
    });
  } catch (err) {
    console.error("Failed to sync new user to Supabase:", err);
  }
}

/**
 * Updates user list local storage & syncs deletion or status to Supabase
 */
export async function deleteUserFromSupabase(userId: string): Promise<void> {
  try {
    await supabase.from("app_users").delete().eq("id", userId);
  } catch (e) {
    // console.error(e);
  }
}

/**
 * Authenticate credentials against Supabase / registered users list.
 */
export async function authenticateUserAsync(
  emailInput: string,
  passwordInput: string,
): Promise<{ user: AppUser; role: UserRole } | null> {
  const normalizedEmail = emailInput.trim().toLowerCase();

  // Try fetching user directly from Supabase first
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!error && data) {
      const validPassword = data.password || "12345";
      if (passwordInput === validPassword && data.active) {
        const user: AppUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          active: Boolean(data.active),
          password: data.password,
        };
        return { user, role: user.role };
      }
      return null;
    }
  } catch (e) {
    // fallback to local storage
  }

  // Fallback to local storage matching
  return authenticateUser(emailInput, passwordInput);
}

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
