import { apiUrl } from "./api";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Multipart/form-data upload helper.
 * - credentials: include (cookies)
 * - CSRF header for unsafe methods
 * - timeout (default 30s)
 */
export async function apiUpload(path, formData, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const method = (opts.method || "POST").toUpperCase();

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30000;

  if (!headers.has("X-CSRF-Token")) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "csrf_token");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const ac = new AbortController();
  const upstream = opts.signal;

  function onUpstreamAbort() {
    try {
      ac.abort(upstream.reason || new DOMException("Aborted", "AbortError"));
    } catch {
      ac.abort();
    }
  }
  if (upstream) {
    if (upstream.aborted) onUpstreamAbort();
    else upstream.addEventListener("abort", onUpstreamAbort, { once: true });
  }

  const t = setTimeout(() => {
    try {
      ac.abort(new DOMException("Request timeout", "TimeoutError"));
    } catch {
      ac.abort();
    }
  }, timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      method,
      credentials: "include",
      body: formData,
      headers,
      signal: ac.signal,
    });

    if (res.status === 204) return null;

    const ct = res.headers.get("content-type") || "";
    let data = null;

    if (ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      const text = await res.text();
      data = safeJsonParse(text) ?? text ?? null;
    }

    if (!res.ok) {
      const err = new Error((data && typeof data === "object" && data.message) ? data.message : "Upload failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(t);
    if (upstream) upstream.removeEventListener?.("abort", onUpstreamAbort);
  }
}
