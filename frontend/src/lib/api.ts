export type ApiError = { status: number; message: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function apiUrl(path: string) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");
  if (opts.accessToken) headers.set("Authorization", `Bearer ${opts.accessToken}`);

  const res = await fetch(apiUrl(path), { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw { status: res.status, message } as ApiError;
  }
  return data as T;
}
