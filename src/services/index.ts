import type { ServiceRegistry } from "./contracts";
import { mockServices } from "./mock/mock-provider";
import { httpServices } from "./http/http-provider";
import { supabaseServices } from "./supabase/supabase-provider";
import type { ServiceProviderKind } from "./types";

/**
 * Single composition root for data access.
 *
 * Switch the active provider by setting VITE_SERVICE_PROVIDER in your .env.local:
 *
 *   VITE_SERVICE_PROVIDER=mock   → in-memory fixtures (default for development)
 *   VITE_SERVICE_PROVIDER=http   → FastAPI backend (set when the backend is available)
 *   VITE_SERVICE_PROVIDER=supabase → live Supabase PostgreSQL database
 *
 * No UI file ever needs to change when switching providers — only this file.
 * The ImportMetaEnv type in src/vite-env.d.ts enforces the allowed values.
 */
const provider: ServiceProviderKind =
  import.meta.env.VITE_SERVICE_PROVIDER ?? "mock";

const registries: Record<ServiceProviderKind, ServiceRegistry> = {
  mock: mockServices,
  http: httpServices,
  supabase: supabaseServices,
};

export const services: ServiceRegistry = registries[provider];

export * from "./contracts";
export * from "./types";
export { queryKeys } from "./query-keys";
