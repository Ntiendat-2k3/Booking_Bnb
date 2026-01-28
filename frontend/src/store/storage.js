const KEY = "airbnb_auth_v1";

export function loadAuthStorage() {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const p = JSON.parse(raw);
    return {
      accessToken: typeof p.accessToken === "string" ? p.accessToken : null,
      refreshToken: typeof p.refreshToken === "string" ? p.refreshToken : null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function saveAuthStorage(s) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
