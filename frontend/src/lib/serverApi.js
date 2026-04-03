const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function serverApiUrl(path) {
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

  // Add a 15s timeout to avoid Vercel 60s build hang if backend is sleeping
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const fetchInit =
    hasNextRevalidate || hasExplicitCache
      ? { ...init, signal: controller.signal }
      : { cache: "no-store", ...init, signal: controller.signal };

  let res;
  try {
    res = await fetch(serverApiUrl(path), fetchInit);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
