/** Trao đổi mã OAuth ở máy chủ; bí mật của Apple và Facebook không đi tới trình duyệt. */
const crypto = require("node:crypto");
const { isIP } = require("node:net");
const jwt = require("jsonwebtoken");

function oauthError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function configFor(provider) {
  if (provider === "apple") {
    const { APPLE_CLIENT_ID: clientId, APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId,
      APPLE_PRIVATE_KEY: privateKey, APPLE_CALLBACK_URL: redirectUri } = process.env;
    if (!clientId || !teamId || !keyId || !privateKey || !redirectUri) return null;
    try {
      const callback = new URL(redirectUri);
      if (callback.protocol !== "https:" || callback.hostname === "localhost" || isIP(callback.hostname)) return null;
    } catch {
      return null;
    }
    return { clientId, teamId, keyId, privateKey: privateKey.replace(/\\n/g, "\n"), redirectUri };
  }
  if (provider === "facebook") {
    const { FACEBOOK_APP_ID: clientId, FACEBOOK_APP_SECRET: clientSecret,
      FACEBOOK_CALLBACK_URL: redirectUri } = process.env;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri };
  }
  return null;
}

function authorizationUrl(provider, config, state, nonce) {
  if (provider === "apple") {
    const url = new URL("https://appleid.apple.com/auth/authorize");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
      response_type: "code", response_mode: "form_post", scope: "name email", state, nonce }).toString();
    return url.toString();
  }
  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
    response_type: "code", scope: "public_profile,email", state }).toString();
  return url.toString();
}

async function providerJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw oauthError("Social login provider rejected the request");
  return response.json();
}

async function appleProfile(code, nonce, config, namePayload) {
  const clientSecret = jwt.sign({}, config.privateKey, { algorithm: "ES256", keyid: config.keyId,
    issuer: config.teamId, audience: "https://appleid.apple.com", subject: config.clientId, expiresIn: "5m" });
  const tokens = await providerJson("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: clientSecret,
      code, grant_type: "authorization_code", redirect_uri: config.redirectUri }),
  });
  if (!tokens.id_token) throw oauthError("Apple did not return an identity token");
  const header = jwt.decode(tokens.id_token, { complete: true })?.header;
  if (header?.alg !== "RS256" || !header.kid) throw oauthError("Invalid Apple identity token");
  const keys = await providerJson("https://appleid.apple.com/auth/keys");
  const jwk = keys.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw oauthError("Apple signing key was not found");
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const claims = jwt.verify(tokens.id_token, publicKey, { algorithms: ["RS256"],
    issuer: "https://appleid.apple.com", audience: config.clientId });
  if (claims.nonce !== nonce || !claims.sub || !claims.email ||
      ![true, "true"].includes(claims.email_verified)) throw oauthError("Invalid Apple account data");

  let submittedName = null;
  try {
    const user = JSON.parse(namePayload || "{}");
    submittedName = [user.name?.firstName, user.name?.lastName]
      .map((part) => typeof part === "string" ? part.replace(/[\u0000-\u001f\u007f<>]/g, "").trim() : "")
      .filter(Boolean).join(" ");
  } catch {
    // Apple chỉ gửi tên ở lần cấp quyền đầu tiên; bỏ qua dữ liệu tùy chọn không hợp lệ.
  }
  return { provider: "apple", provider_id: claims.sub, email: claims.email,
    full_name: (submittedName || claims.email.split("@")[0]).slice(0, 255), avatar_url: null };
}

async function facebookProfile(code, config) {
  const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
  tokenUrl.search = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
    redirect_uri: config.redirectUri, code }).toString();
  const tokens = await providerJson(tokenUrl);
  if (!tokens.access_token) throw oauthError("Facebook did not return an access token");
  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.search = new URLSearchParams({ fields: "id,name,email,picture.width(256)",
    access_token: tokens.access_token }).toString();
  const profile = await providerJson(profileUrl);
  if (!profile.id || !profile.email) throw oauthError("Facebook account has no shared email", 400);
  return { provider: "facebook", provider_id: profile.id, email: profile.email,
    full_name: (profile.name || "Facebook User").slice(0, 255),
    avatar_url: profile.picture?.data?.url || null };
}

module.exports = { configFor, authorizationUrl, appleProfile, facebookProfile };
