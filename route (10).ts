import { NextRequest, NextResponse } from "next/server";
import { resolveArtistMbid, getLatestSetlistSummary } from "@/lib/setlistfm";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const artistName = req.nextUrl.searchParams.get("artistName");
  if (!artistName) return NextResponse.json({ error: "missing_artist_name" }, { status: 400 });

  try {
    const mbid = await resolveArtistMbid(artistName);
    if (!mbid) return NextResponse.json({ summary: null });
    const summary = await getLatestSetlistSummary(mbid);
    return NextResponse.json({ summary });
  } catch (e: any) {
    // Not configured, or setlist.fm has nothing for this artist — either
    // way this callout is a nice-to-have, not core functionality, so fail
    // quietly to null rather than surfacing an error in the UI for it.
    return NextResponse.json({ summary: null, error: e.message });
  }
}
