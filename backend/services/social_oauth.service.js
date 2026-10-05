/** Trao đổi mã OAuth Facebook ở máy chủ; bí mật ứng dụng không đi tới trình duyệt. */

function oauthError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function configFor(provider) {
  if (provider === "facebook") {
    const { FACEBOOK_APP_ID: clientId, FACEBOOK_APP_SECRET: clientSecret,
      FACEBOOK_CALLBACK_URL: redirectUri } = process.env;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri };
  }
  return null;
}

function authorizationUrl(config, state) {
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

module.exports = { configFor, authorizationUrl, facebookProfile };
