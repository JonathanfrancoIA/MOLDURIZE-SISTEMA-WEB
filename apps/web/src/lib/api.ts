/**
 * MOLDURIZE WEB — API Client Instance
 * Central entry point for the frontend to call the FastAPI backend.
 */
import { createApiClient } from "@moldurize/shared";

export const api = createApiClient({
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin.replace(/:\d+$/, ":8001") : "http://localhost:8001"),
});

export { ApiClientError } from "@moldurize/shared";
export type * from "@moldurize/shared";
