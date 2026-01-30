import { apiUrl } from "./api";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function apiUpload(path, formData, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const method = (opts.method || "POST").toUpperCase();

  // CSRF for unsafe methods (double submit cookie)
  if (!headers.has("X-CSRF-Token")) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "csrf_token");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    body: formData,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message || "Upload failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
