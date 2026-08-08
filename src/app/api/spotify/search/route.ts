import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, searchArtists } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ artists: [] });

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  try {
    const artists = await searchArtists(q, accessToken);
    return NextResponse.json({ artists });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
