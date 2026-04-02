import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
});

let manualCsrfToken = null;

export const setManualCsrfToken = (token) => {
  manualCsrfToken = token;
};

// Request interceptor for CSRF
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  const unsafe = !["get", "head", "options"].includes(method);

  if (unsafe && !config.headers["X-CSRF-Token"]) {
    const csrf =
      manualCsrfToken ||
      getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "csrf_token");
    if (csrf) {
      config.headers["X-CSRF-Token"] = csrf;
    }
  }
  return config;
});

// ---------- Automatic Token Refresh on 401 ----------

let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
}

// Auth endpoints that should NOT trigger a refresh retry
const AUTH_PATHS = [
  "/api/v1/auth/refresh",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/logout",
  "/api/v1/auth/csrf",
];

function isAuthPath(url) {
  return AUTH_PATHS.some((p) => url?.includes(p));
}

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Only intercept 401 for non-auth endpoints, and only once per request
    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthPath(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      isRefreshing = true;

      try {
        // Ensure CSRF cookie is present before refreshing
        await api({ url: "/api/v1/auth/csrf", method: "get" });

        // Refresh the session (rotates tokens via httpOnly cookies)
        await api({ url: "/api/v1/auth/refresh", method: "post", data: {} });

        processQueue(null);
        // Retry the original request with the new access token cookie
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // Refresh failed — session is truly expired.
        // Dynamically import the store to avoid circular dependencies.
        try {
          const { store } = await import("@/store/store");
          const { clearAuth } = await import("@/store/authSlice");
          const { clearFavorites } = await import("@/store/favoritesSlice");
          store.dispatch(clearAuth());
          store.dispatch(clearFavorites());
        } catch {
          // Store not available (SSR), silently ignore
        }

        // Fall through to the normal error handling below
        const msg =
          refreshError.response?.data?.message ||
          refreshError.message ||
          "Session expired";
        const err = new Error(msg);
        err.status = 401;
        err.data = refreshError.response?.data;
        err.originalError = refreshError;
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Default error normalization (non-401, or auth endpoints)
    const data = error.response?.data;
    const message = data?.message || error.message || "Request failed";

    const err = new Error(message);
    err.status = status;
    err.data = data;
    err.originalError = error;

    return Promise.reject(err);
  }
);

/**
 * apiFetch wrapper for backward compatibility and axios usage.
 */
export async function apiFetch(path, opts = {}) {
  const {
    method = "GET",
    body,
    headers,
    params,
    ...rest
  } = opts;

  try {
    const response = await api({
      url: path,
      method: method.toLowerCase(),
      data: body,
      headers: headers,
      params: params,
      ...rest,
    });
    return response;
  } catch (error) {
    // Errors are already normalized by the interceptor
    throw error;
  }
}

export default api;

