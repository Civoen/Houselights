import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, searchArtists } from "@/lib/spotify";
import { getAppAccessToken } from "@/lib/spotifyAppToken";


export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ artists: [] });

  let accessToken = await getValidAccessToken();
  if (!accessToken) {
    // Not logged in — search still works for a guest via an app-level
    // token, since this is public catalog data, not anything tied to a
    // specific person's account.
    try {
      accessToken = await getAppAccessToken();
    } catch (e: any) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
  }

  try {
    const artists = await searchArtists(q, accessToken);
    return NextResponse.json({ artists });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
