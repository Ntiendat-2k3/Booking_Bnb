import { apiFetch } from "@/lib/api";
import {
  clearAuth,
  setCsrfReady,
  setError,
  setStatus,
  setUser,
} from "./authSlice";

export const ensureCsrf = () => async (dispatch) => {
  try {
    await apiFetch("/api/v1/auth/csrf", { method: "GET" });
    dispatch(setCsrfReady(true));
  } catch {
    // even if fails, app can still load public pages
    dispatch(setCsrfReady(false));
  }
};

export const bootstrapAuth = () => async (dispatch) => {
  await dispatch(ensureCsrf());
  // Try restore session using cookies
  try {
    await dispatch(refreshSession());
    await dispatch(fetchProfile());
  } catch {
    // ignore (not logged in)
  }
};

export const registerLocal = (body) => async (dispatch) => {
  dispatch(setStatus("loading"));
  dispatch(setError(null));
  try {
    await dispatch(ensureCsrf());
    const res = await apiFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    dispatch(setUser(res.data.user));
    dispatch(setStatus("idle"));
    return true;
  } catch (e) {
    dispatch(setError(e?.message || "Register failed"));
    dispatch(setStatus("error"));
    return false;
  }
};

export const loginLocal = (body) => async (dispatch) => {
  dispatch(setStatus("loading"));
  dispatch(setError(null));
  try {
    await dispatch(ensureCsrf());
    const res = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    dispatch(setUser(res.data.user));
    dispatch(setStatus("idle"));
    return true;
  } catch (e) {
    dispatch(setError(e?.message || "Login failed"));
    dispatch(setStatus("error"));
    return false;
  }
};

export const refreshSession = () => async (dispatch) => {
  await dispatch(ensureCsrf());
  // will rotate cookies if refresh cookie exists
  await apiFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const fetchProfile = () => async (dispatch) => {
  try {
    dispatch(setStatus("loading"));
    const res = await apiFetch("/api/v1/auth/profile", { method: "GET" });
    dispatch(setUser(res.data));
    dispatch(setStatus("idle"));
  } catch (e) {
    if (e?.status === 401) {
      // try refresh once
      try {
        await dispatch(refreshSession());
        const res2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
        dispatch(setUser(res2.data));
        dispatch(setStatus("idle"));
        return;
      } catch {
        // fallthrough
      }
    }
    dispatch(setError(e?.message || "Fetch profile failed"));
    dispatch(setStatus("error"));
  }
};

export const logout = () => async (dispatch) => {
  try {
    await dispatch(ensureCsrf());
    await apiFetch("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch {}
  dispatch(clearAuth());
};
