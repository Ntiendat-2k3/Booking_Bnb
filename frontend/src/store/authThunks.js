import { apiFetch, setManualCsrfToken } from "@/lib/api";
import { clearAuth, setCsrfReady, setError, setStatus, setUser, setInitialized } from "./authSlice";
import { fetchFavorites } from "./favoritesThunks";
import { clearFavorites } from "./favoritesSlice";

export const ensureCsrf = () => async (dispatch) => {
  try {
    const res = await apiFetch("/api/v1/auth/csrf", { method: "GET" });
    if (res.data?.csrfToken || res.csrfToken) {
      setManualCsrfToken(res.data?.csrfToken || res.csrfToken);
    }
    dispatch(setCsrfReady(true));
  } catch {
    // Trang công khai vẫn hoạt động khi chưa lấy được CSRF.
    dispatch(setCsrfReady(false));
  }
};

export const bootstrapAuth = () => async (dispatch) => {
  await dispatch(ensureCsrf());
  // Khôi phục phiên từ cookie trước khi tải dữ liệu riêng tư.
  try {
    await dispatch(refreshSession());
    await dispatch(fetchProfile());
    await dispatch(fetchFavorites());
  } catch {
    // Chưa có phiên đăng nhập.
  } finally {
    dispatch(setInitialized(true));
  }
};

export const registerLocal = (body) => async (dispatch) => {
  dispatch(setStatus("loading"));
  dispatch(setError(null));
  try {
    await dispatch(ensureCsrf());
    const res = await apiFetch("/api/v1/auth/register", {
      method: "POST",
      body: body,
    });

    dispatch(setUser(res.data.user));
    dispatch(setStatus("idle"));
    return true;
  } catch (e) {
    dispatch(setError(e?.message || "auth.registerFailed"));
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
      body: body,
    });

    dispatch(setUser(res.data.user));
    dispatch(setStatus("idle"));
    return true;
  } catch (e) {
    dispatch(setError(e?.message || "auth.loginFailed"));
    dispatch(setStatus("error"));
    return false;
  }
};

export const refreshSession = () => async (dispatch) => {
  await dispatch(ensureCsrf());
  // Máy chủ làm mới cookie nếu phiên còn hợp lệ.
  await apiFetch("/api/v1/auth/refresh", { method: "POST", body: {} });
};

export const fetchProfile = () => async (dispatch) => {
  try {
    dispatch(setStatus("loading"));
    const res = await apiFetch("/api/v1/auth/profile", { method: "GET" });
    dispatch(setUser(res.data));
    dispatch(setStatus("idle"));
  } catch (e) {
    if (e?.status === 401) {
      // Thử khôi phục phiên trước khi báo lỗi hồ sơ.
      try {
        await dispatch(refreshSession());
        const res2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
        dispatch(setUser(res2.data));
        dispatch(setStatus("idle"));
        return;
      } catch {
        // Tiếp tục xử lý lỗi hồ sơ.
      }
    }
    dispatch(setError(e?.message || "auth.profileFailed"));
    dispatch(setStatus("error"));
  }
};

export const logout = () => async (dispatch) => {
  try {
    await dispatch(ensureCsrf());
    await apiFetch("/api/v1/auth/logout", { method: "POST", body: {} });
  } catch {}
  dispatch(clearAuth());
  dispatch(clearFavorites());
};


export const becomeHost = () => async (dispatch) => {
  try {
    await dispatch(ensureCsrf());
    const res = await apiFetch("/api/v1/host/apply", { method: "POST", body: {} });
    // Máy chủ trả về hồ sơ đã cập nhật vai trò.
    dispatch(setUser(res.data));
    return true;
  } catch (e) {
    dispatch(setError(e?.message || "auth.hostFailed"));
    return false;
  }
};
