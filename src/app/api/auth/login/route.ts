import { NextRequest, NextResponse } from "next/server";
import { getAuthorizeUrl } from "@/lib/spotify";


export async function GET(req: NextRequest) {
  const state = crypto.randomUUID();
  const forceDialog = req.nextUrl.searchParams.get("switch") === "1";
  const url = getAuthorizeUrl(state, forceDialog);
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
