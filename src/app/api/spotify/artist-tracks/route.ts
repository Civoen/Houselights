import { NextRequest, NextResponse } from "next/server";
import {
  getValidAccessToken,
  getArtistTopTracks,
  getArtistCatalog,
  selectTracksForFilters,
  searchTracksForArtist,
  getTracksByIds,
  getUserMarket,
} from "@/lib/spotify";
import { FilterType, SpotifyTrack } from "@/lib/types";

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
    const needsPopular = filters.includes("popular");
    const needsCatalog = filters.some((f) => f !== "popular");

    const [popularPool, catalogPool] = await Promise.all([
      needsPopular ? getArtistTopTracks(artistId, accessToken, market) : Promise.resolve([] as SpotifyTrack[]),
      needsCatalog ? getArtistCatalog(artistId, accessToken, market) : Promise.resolve([] as SpotifyTrack[]),
    ]);

    if (popularPool.length === 0 && catalogPool.length === 0) {
      return NextResponse.json(
        { error: `No tracks found for this artist in your Spotify market (${market}).`, tracks: [] },
        { status: 200 }
      );
    }

    const tracks = selectTracksForFilters({ popular: popularPool, catalog: catalogPool }, filters, count);
    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
