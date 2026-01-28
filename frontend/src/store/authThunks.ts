import { apiFetch } from "@/lib/api";
import { clearAuth, setError, setStatus, setTokens, setUser } from "./authSlice";
import { clearAuthStorage, loadAuthStorage, saveAuthStorage } from "./storage";
import type { AppDispatch, RootState } from "./store";

type ApiResponse<T> = { status: "success" | "error"; message: string; data: T };
type LoginData = { user: any; accessToken: string; refreshToken: string };

export const bootstrapAuth = () => async (dispatch: AppDispatch) => {
  const saved = loadAuthStorage();
  if (saved.accessToken && saved.refreshToken) {
    dispatch(setTokens({ accessToken: saved.accessToken, refreshToken: saved.refreshToken }));
    await dispatch(fetchProfile());
  }
};

export const registerLocal =
  (body: { email: string; password: string; full_name: string }) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    dispatch(setError(null));
    try {
      const res = await apiFetch<ApiResponse<LoginData>>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });

      dispatch(setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
      saveAuthStorage({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      dispatch(setUser(res.data.user));
      dispatch(setStatus("idle"));
      return true;
    } catch (e: any) {
      dispatch(setError(e?.message || "Register failed"));
      dispatch(setStatus("error"));
      return false;
    }
  };

export const loginLocal =
  (body: { email: string; password: string }) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    dispatch(setError(null));
    try {
      const res = await apiFetch<ApiResponse<LoginData>>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      dispatch(setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
      saveAuthStorage({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      dispatch(setUser(res.data.user));
      dispatch(setStatus("idle"));
      return true;
    } catch (e: any) {
      dispatch(setError(e?.message || "Login failed"));
      dispatch(setStatus("error"));
      return false;
    }
  };

export const refreshTokens = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  const rt = getState().auth.refreshToken;
  if (!rt) throw new Error("No refresh token");

  const res = await apiFetch<ApiResponse<{ accessToken: string; refreshToken: string }>>(
    "/api/v1/auth/refresh",
    { method: "POST", body: JSON.stringify({ refresh_token: rt }) }
  );

  dispatch(setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
  saveAuthStorage({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
};

export const fetchProfile = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  const at = getState().auth.accessToken;
  if (!at) return;

  try {
    dispatch(setStatus("loading"));
    const res = await apiFetch<ApiResponse<any>>("/api/v1/auth/profile", { method: "GET", accessToken: at });
    dispatch(setUser(res.data));
    dispatch(setStatus("idle"));
  } catch (e: any) {
    if (e?.status === 401) {
      try {
        await dispatch(refreshTokens() as any);
        const at2 = getState().auth.accessToken;
        const res2 = await apiFetch<ApiResponse<any>>("/api/v1/auth/profile", {
          method: "GET",
          accessToken: at2 || undefined,
        });
        dispatch(setUser(res2.data));
        dispatch(setStatus("idle"));
        return;
      } catch {
        // ignore
      }
    }
    dispatch(setError(e?.message || "Fetch profile failed"));
    dispatch(setStatus("error"));
  }
};

export const logout = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  const rt = getState().auth.refreshToken;
  try {
    if (rt) {
      await apiFetch("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: rt }) });
    }
  } catch {}
  clearAuthStorage();
  dispatch(clearAuth());
};
