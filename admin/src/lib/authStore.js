/**
 * Admin now uses cookie-based auth (access + refresh httpOnly).
 * This file remains for compatibility but does not store tokens anymore.
 */
export function getAccessToken() {
  return null;
}
export function setAccessToken(_token) {}
export function clearAccessToken() {}
