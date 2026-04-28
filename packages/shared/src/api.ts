/**
 * MOLDURIZE WEB — Typed API Client
 *
 * Uso:
 *   import { createApiClient } from "@moldurize/shared/api";
 *   const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL });
 *   const result = await api.optimize({ parts: [...], block: {...} });
 */
import type {
  NestingRequest,
  NestingResponse,
  NestingSummary,
  GCodeRequest,
  Remnant,
  RemnantCreate,
  RemnantUpdate,
  PlansResponse,
  CheckoutRequest,
  CheckoutResponse,
  ApiError,
} from "./types";

export class ApiClientError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl =
    options.baseUrl ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
    "http://localhost:8001";

  const fetchFn = options.fetch || fetch;

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) || {}),
    };

    if (options.getAuthToken) {
      const token = await options.getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      let detail: unknown = null;
      let message = `HTTP ${response.status}`;
      if (contentType.includes("application/json")) {
        const err = (await response.json()) as ApiError;
        detail = err.detail;
        if (typeof err.detail === "string") {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail
            .map((e) => `${e.loc.join(".")}: ${e.msg}`)
            .join("; ");
        }
      } else {
        message = await response.text();
      }
      throw new ApiClientError(message, response.status, detail);
    }

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    // Fallback — text/blob responses handled separately
    return (await response.text()) as unknown as T;
  }

  async function requestBlob(
    path: string,
    init: RequestInit = {}
  ): Promise<Blob> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) || {}),
    };
    if (options.getAuthToken) {
      const token = await options.getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetchFn(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new ApiClientError(
        `HTTP ${response.status}`,
        response.status,
        await response.text()
      );
    }
    return await response.blob();
  }

  return {
    baseUrl,

    // ── Health ────────────────────────────────────────────────────────────
    health: () => request<{ status: string }>("/health"),

    // ── Nesting ───────────────────────────────────────────────────────────
    optimize: (body: NestingRequest) =>
      request<NestingResponse>("/api/v1/optimize", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    listNestings: () => request<NestingSummary[]>("/api/v1/nestings"),

    getNesting: (id: string) =>
      request<NestingResponse & { id: string }>(`/api/v1/nestings/${id}`),

    // ── G-Code ────────────────────────────────────────────────────────────
    generateGCode: (body: GCodeRequest) =>
      request<string>("/api/v1/gcode", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    downloadGCode: (body: GCodeRequest) =>
      requestBlob("/api/v1/gcode/download", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    // ── Remnants ──────────────────────────────────────────────────────────
    listRemnants: (status?: "disponivel" | "descartado") => {
      const q = status ? `?status=${status}` : "";
      return request<Remnant[]>(`/api/v1/remnants${q}`);
    },

    createRemnant: (body: RemnantCreate) =>
      request<Remnant>("/api/v1/remnants", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    getRemnant: (id: string) => request<Remnant>(`/api/v1/remnants/${id}`),

    updateRemnant: (id: string, body: RemnantUpdate) =>
      request<Remnant>(`/api/v1/remnants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),

    deleteRemnant: (id: string) =>
      request<{ success: boolean }>(`/api/v1/remnants/${id}`, {
        method: "DELETE",
      }),

    // ── Billing ───────────────────────────────────────────────────────────
    getPlans: () => request<PlansResponse>("/api/v1/billing/plans"),

    createCheckout: (body: CheckoutRequest) =>
      request<CheckoutResponse>("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    createPortal: (body: { customer_id: string; return_url?: string }) =>
      request<{ portal_url: string }>("/api/v1/billing/portal", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
