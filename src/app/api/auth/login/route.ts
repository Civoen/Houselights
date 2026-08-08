import { NextResponse } from "next/server";
import { getAuthorizeUrl } from "@/lib/spotify";

export async function GET() {
  const state = crypto.randomUUID();
  const url = getAuthorizeUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("fp_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
