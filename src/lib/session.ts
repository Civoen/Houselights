import { cookies } from "next/headers";

const ACCESS_COOKIE = "fp_access_token";
const REFRESH_COOKIE = "fp_refresh_token";
const EXPIRY_COOKIE = "fp_token_expiry";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Spotify's refresh token itself doesn't expire on its own — it stays valid
// until revoked. Without an explicit maxAge, these cookies default to
// session cookies that get wiped whenever the browser/PWA process ends,
// which is exactly what "closing and reopening the app" looks like — so the
// actual limiting factor on staying logged in was this cookie config, not
// anything on Spotify's side. 180 days is generous but not indefinite.
const SIX_MONTHS = 60 * 60 * 24 * 180;

export async function setTokens(tokens: StoredTokens) {
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SIX_MONTHS,
  };
  store.set(ACCESS_COOKIE, tokens.accessToken, common);
  store.set(REFRESH_COOKIE, tokens.refreshToken, common);
  store.set(EXPIRY_COOKIE, String(tokens.expiresAt), common);
}

export async function getTokens(): Promise<StoredTokens | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  const expiresAt = Number(store.get(EXPIRY_COOKIE)?.value || 0);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt };
}

export async function clearTokens() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(EXPIRY_COOKIE);
}
