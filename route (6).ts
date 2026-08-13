import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify";

export const runtime = "edge";

export async function GET() {
  const accessToken = await getValidAccessToken();
  return NextResponse.json({ connected: !!accessToken });
}
