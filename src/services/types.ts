/**
 * Backend-agnostic service contracts.
 *
 * The UI never talks to a backend directly — it talks to these interfaces.
 * Today they are fulfilled by in-memory mock providers; later the same
 * interfaces will be fulfilled by a FastAPI HTTP provider with zero UI churn.
 */

export type ID = string;

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  filters?: Record<string, string | number | boolean | undefined>;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/** Normalised error shape every provider must throw. */
export class ServiceError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ServiceError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "unknown_error";
    this.details = options.details;
  }
}

export type ServiceProviderKind = "mock" | "http" | "supabase";
