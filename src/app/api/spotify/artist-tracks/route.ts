import { NextRequest, NextResponse } from "next/server";
import {
  getValidAccessToken,
  getArtistTrackPools,
  selectTracksForFilters,
  searchTracksForArtist,
  getTracksByIds,
  getUserMarket,
} from "@/lib/spotify";
import { FilterType } from "@/lib/types";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  const artistName = req.nextUrl.searchParams.get("artistName") || "";
  const filtersParam = req.nextUrl.searchParams.get("filters") || req.nextUrl.searchParams.get("filter") || "popular";
  const filters = filtersParam.split(",").filter(Boolean) as FilterType[];
  const count = Number(req.nextUrl.searchParams.get("count") || "10");
  const pickQuery = req.nextUrl.searchParams.get("pickQuery");
  const trackIds = req.nextUrl.searchParams.get("trackIds");

  if (trackIds) {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });
    try {
      const tracks = await getTracksByIds(trackIds.split(","), accessToken);
      return NextResponse.json({ tracks });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  }

  if (!artistId) return NextResponse.json({ error: "missing_artist" }, { status: 400 });

  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  try {
    if (pickQuery) {
      const results = await searchTracksForArtist(artistId, artistName, pickQuery, accessToken);
      return NextResponse.json({ tracks: results });
    }

    const market = await getUserMarket(accessToken);
    const { pools, warning } = await getArtistTrackPools(artistId, artistName, accessToken, market);

    if (pools.popular.length === 0 && pools.recent.length === 0) {
      return NextResponse.json(
        { error: warning || "No tracks found for this artist.", tracks: [] },
        { status: 200 }
      );
    }

    const tracks = selectTracksForFilters(pools, filters, count);

    // Surface the real reason even when some tracks did come through, so a
    // partial failure isn't silently indistinguishable from "this artist
    // just doesn't have more songs." Only for genuine failures — a pool
    // that's simply smaller than the requested count because the artist
    // doesn't have more music isn't something retrying would fix.
    return NextResponse.json(warning ? { tracks, error: warning } : { tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
