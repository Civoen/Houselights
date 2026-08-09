import { NextResponse } from "next/server";
import { getValidAccessToken, getTopArtists } from "@/lib/spotify";

export const runtime = "edge";

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  try {
    const artists = await getTopArtists(accessToken);
    return NextResponse.json({ artists });
  } catch (e: any) {
    // 403 here almost always means the session was created before the
    // user-top-read scope was added — not a real failure, just needs a
    // reconnect. Distinguish it so the client can show the right hint
    // instead of a generic error.
    if (String(e.message).includes("403")) {
      return NextResponse.json({ error: "insufficient_scope" }, { status: 200 });
    }
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
