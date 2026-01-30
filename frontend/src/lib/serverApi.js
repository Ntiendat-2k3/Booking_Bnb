const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function serverApiUrl(path) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

/**
 * Server-side fetch helper.
 *
 * Defaults to `cache: "no-store"` to keep the current behavior.
 * You can override caching by passing a second `init` argument, e.g.
 * `serverGetJson(path, { next: { revalidate: 300 } })`.
 */
export async function serverGetJson(path, init = {}) {
  const res = await fetch(serverApiUrl(path), { cache: "no-store", ...init });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
