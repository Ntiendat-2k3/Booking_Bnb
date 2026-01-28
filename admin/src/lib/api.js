const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function apiUrl(path) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function apiFetch(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");

  const method = (opts.method || "GET").toUpperCase();
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (unsafe && !headers.has("X-CSRF-Token")) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "csrf_token");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(apiUrl(path), { credentials: "include", ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || "Request failed";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}
