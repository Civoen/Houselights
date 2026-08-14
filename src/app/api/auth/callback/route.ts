import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify";
import { setTokens } from "@/lib/session";
import { getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const savedState = req.cookies.get("fp_oauth_state")?.value;

  const appUrl = getEnv("APP_URL") || url.origin;

  if (error) {
    return NextResponse.redirect(`${appUrl}/lineup?spotify_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/lineup?spotify_error=state_mismatch`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await setTokens(tokens);
  } catch (e) {
    return NextResponse.redirect(`${appUrl}/lineup?spotify_error=token_exchange_failed`);
  }

  const res = NextResponse.redirect(`${appUrl}/lineup`);
  res.cookies.delete("fp_oauth_state");
  return res;
}
