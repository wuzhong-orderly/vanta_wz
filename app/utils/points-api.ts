import { getRuntimeConfig } from "./runtime-config";

const POINTS_API_BASE_URL =
  (getRuntimeConfig("VITE_POINTS_API_BASE_URL") || "").replace(/\/+$/, "");

export async function fetchPointsJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolvePointsApiUrl(url), {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.text();
    let errorMessage = payload || `Request failed: ${response.status}`;

    try {
      const parsed = JSON.parse(payload) as { error?: string };
      errorMessage = parsed.error || errorMessage;
    } catch {
      // Keep the raw response text when the server did not return JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export function resolvePointsApiUrl(url: string) {
  if (!POINTS_API_BASE_URL) {
    return url;
  }

  const normalizedPath = url.startsWith("/points-api/")
    ? `/api/${url.slice("/points-api/".length)}`
    : url.startsWith("/")
      ? url
      : `/${url}`;

  return `${POINTS_API_BASE_URL}${normalizedPath}`;
}
