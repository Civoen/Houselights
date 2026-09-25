import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, createSpotifyPlaylist } from "@/lib/spotify";


export async function POST(req: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const body = await req.json();
  const { name, description, trackUris, coverImageBase64 } = body as {
    name: string;
    description: string;
    trackUris: string[];
    coverImageBase64?: string;
  };

  if (!name || !Array.isArray(trackUris) || trackUris.length === 0) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const playlist = await createSpotifyPlaylist({
      accessToken,
      name,
      description: description || "",
      trackUris,
      coverImageBase64,
    });
    return NextResponse.json({ playlist });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
