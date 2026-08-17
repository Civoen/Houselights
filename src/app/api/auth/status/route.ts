import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify";


export async function GET() {
  const accessToken = await getValidAccessToken();
  return NextResponse.json({ connected: !!accessToken });
}
