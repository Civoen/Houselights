import { NextRequest, NextResponse } from "next/server";
import {
  getValidAccessToken,
  getArtistTopTracks,
  getArtistCatalog,
  filterTracks,
  searchTracksForArtist,
  getTracksByIds,
} from "@/lib/spotify";
import { FilterType } from "@/lib/types";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  const artistName = req.nextUrl.searchParams.get("artistName") || "";
  const filter = (req.nextUrl.searchParams.get("filter") || "popular") as FilterType;
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

    const pool = filter === "popular"
      ? await getArtistTopTracks(artistId, accessToken)
      : await getArtistCatalog(artistId, accessToken);

    const tracks = filterTracks(pool, filter, count);
    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
