import { NextRequest, NextResponse } from "next/server";
import { clearTokens } from "@/lib/session";
import { getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  await clearTokens();
  const appUrl = getEnv("APP_URL") || new URL(req.url).origin;
  return NextResponse.redirect(`${appUrl}/`);
}
