const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function serverApiUrl(path) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

export async function serverGetJson(path) {
  const res = await fetch(serverApiUrl(path), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
