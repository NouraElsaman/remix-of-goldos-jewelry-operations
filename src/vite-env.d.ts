/// <reference types="vite/client" />

/**
 * Type-safe augmentation of Vite's ImportMetaEnv.
 *
 * Every VITE_* variable used in the application must be declared here.
 * Undeclared variables produce a TypeScript error at the usage site,
 * ensuring that no variable is consumed silently without documentation.
 *
 * See .env.example for the full description of each variable.
 */
interface ImportMetaEnv {
  /**
   * Data service provider.
   *   "mock" → in-memory fixtures, no backend required (default)
   *   "http" → live FastAPI backend (requires VITE_API_URL)
   *   "supabase" → live Supabase PostgreSQL backend
   */
  readonly VITE_SERVICE_PROVIDER?: "mock" | "http" | "supabase";

  /**
   * Base URL for the FastAPI backend.
   * Required when VITE_SERVICE_PROVIDER is "http".
   * Do not include a trailing slash.
   * @example "http://localhost:8000"
   */
  readonly VITE_API_URL?: string;

  /** Supabase Project URL */
  readonly VITE_SUPABASE_URL?: string;

  /** Supabase Anon Key */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
