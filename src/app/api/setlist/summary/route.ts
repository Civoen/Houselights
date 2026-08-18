import { NextRequest, NextResponse } from "next/server";
import { resolveArtistMbidCandidates, findArtistSetlistSummary } from "@/lib/setlistfm";


export async function GET(req: NextRequest) {
  const artistName = req.nextUrl.searchParams.get("artistName");
  if (!artistName) return NextResponse.json({ error: "missing_artist_name" }, { status: 400 });

  try {
    const candidates = await resolveArtistMbidCandidates(artistName);
    if (candidates.length === 0) return NextResponse.json({ summary: null, reason: "no_artist_match" });
    const summary = await findArtistSetlistSummary(candidates);
    return NextResponse.json({ summary, reason: summary ? undefined : "no_nonempty_setlists" });
  } catch (e: any) {
    // Not configured, or setlist.fm has nothing for this artist — either
    // way this callout is a nice-to-have, not core functionality, so fail
    // quietly to null rather than surfacing an error in the UI for it.
    // Defensive fallback for whatever got thrown: a plain fetch failure in
    // the Workers runtime isn't guaranteed to be a real Error with a
    // populated .message, and an undefined error here would get silently
    // dropped by JSON.stringify — making a genuine failure indistinguishable
    // from "nothing found," which is exactly the ambiguity that made this
    // bug hard to diagnose in the first place.
    const message = e?.message || (typeof e === "string" ? e : null) || `Unexpected error: ${String(e)}`;
    return NextResponse.json({ summary: null, error: message });
  }
}
