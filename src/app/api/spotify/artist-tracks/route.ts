import { NextRequest, NextResponse } from "next/server";
import {
  getValidAccessToken,
  getArtistTrackPools,
  selectTracksForFilters,
  searchTracksForArtist,
  getTracksByIds,
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

    const { pools, supplemental, warning } = await getArtistTrackPools(artistId, artistName, accessToken);

    if (pools.popular.length === 0 && pools.setlist.length === 0 && supplemental.length === 0) {
      return NextResponse.json(
        { error: warning || "No tracks found for this artist.", tracks: [] },
        { status: 200 }
      );
    }

    const tracks = selectTracksForFilters(pools, filters, count, supplemental);

    // Surface the real reason even when some tracks did come through, so a
    // partial failure isn't silently indistinguishable from "this artist
    // just doesn't have more songs." Two distinct cases: an actual request
    // failure (warning), or a genuine shortfall — search only found fewer
    // distinct tracks than requested, which retrying won't fix but is still
    // worth being upfront about rather than silently under-filling.
    let message = warning;
    if (!message && tracks.shortBy > 0) {
      message = `Found ${tracks.tracks.length} of the ${count} requested — that's genuinely all Search could surface for this artist.`;
    }

    return NextResponse.json(message ? { tracks: tracks.tracks, error: message } : { tracks: tracks.tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
