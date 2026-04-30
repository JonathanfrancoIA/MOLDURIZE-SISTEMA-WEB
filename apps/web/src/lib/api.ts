/**
 * MOLDURIZE WEB — API Client Instance
 * Central entry point for the frontend to call the FastAPI backend.
 */
import { createApiClient } from "@moldurize/shared";

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? window.location.origin.replace(/:\d+$/, ":8001")
      : "http://localhost:8001")
  );
}

export function createBrowserApiClient(
  getAuthToken?: () => string | null | Promise<string | null>
) {
  return createApiClient({
    baseUrl: getApiBaseUrl(),
    getAuthToken,
  });
}

export const api = createBrowserApiClient(async () => {
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    return await (window as any).Clerk.session.getToken();
  }
  return null;
});

export { ApiClientError, createApiClient } from "@moldurize/shared";
export type * from "@moldurize/shared";
