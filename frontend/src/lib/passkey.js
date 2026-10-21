import { apiFetch } from "@/lib/api";
export { afterLoginPath } from "./afterLoginPath.mjs";

/** Trình duyệt giữ khóa riêng; máy chủ chỉ nhận dữ liệu WebAuthn để xác minh. */
export async function registerPasskey(name) {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const { data: options } = await apiFetch("/api/v1/auth/passkeys/register/options", { method: "POST", body: {} });
  const response = await startRegistration({ optionsJSON: options });
  return apiFetch("/api/v1/auth/passkeys/register/verify", { method: "POST", body: { response, name } });
}

export async function loginWithPasskey() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const { data: options } = await apiFetch("/api/v1/auth/passkeys/login/options", { method: "POST", body: {} });
  const response = await startAuthentication({ optionsJSON: options });
  return apiFetch("/api/v1/auth/passkeys/login/verify", { method: "POST", body: { response } });
}
