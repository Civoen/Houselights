import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, getPlaylistTracks } from "@/lib/spotify";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  try {
    const tracks = await getPlaylistTracks(id, accessToken);
    return NextResponse.json({ tracks });
  } catch (e: any) {
    const message = e?.message || "";
    if (message.includes("403")) {
      return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
