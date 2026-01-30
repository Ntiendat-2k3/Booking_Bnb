const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function serverApiUrl(path) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

/**
 * Server-side fetch helper (intern-style).
 *
 * Rule (to avoid Next.js warning):
 * - If you pass `next: { revalidate: ... }` => we DO NOT set `cache`.
 * - If you pass `cache: ...` yourself        => we DO NOT override it.
 * - Otherwise (default)                      => `cache: "no-store"`.
 *
 * Examples:
 *   // Room detail cache 5 minutes:
 *   serverGetJson("/api/v1/listings/xxx", { next: { revalidate: 300 } })
 *
 *   // Search always fresh:
 *   serverGetJson("/api/v1/listings?..." ) // default no-store
 */
export async function serverGetJson(path, init = {}) {
  const hasNextRevalidate = init?.next?.revalidate !== undefined;
  const hasExplicitCache = Object.prototype.hasOwnProperty.call(init, "cache");

  const fetchInit =
    hasNextRevalidate || hasExplicitCache
      ? { ...init }
      : { cache: "no-store", ...init };

  const res = await fetch(serverApiUrl(path), fetchInit);

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
