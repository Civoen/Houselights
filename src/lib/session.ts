import { cookies } from "next/headers";

const ACCESS_COOKIE = "fp_access_token";
const REFRESH_COOKIE = "fp_refresh_token";
const EXPIRY_COOKIE = "fp_token_expiry";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function setTokens(tokens: StoredTokens) {
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
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
