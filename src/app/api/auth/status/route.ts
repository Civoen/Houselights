import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify";

// This has to be checked fresh on every request — a cached "not connected"
// response served from the browser, an intermediate CDN layer, or Next's
// own caching would show the guest banner to someone who's actually
// logged in, with no way to tell from the UI that it's a stale answer
// rather than a real one.
export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getValidAccessToken();
  return NextResponse.json(
    { connected: !!accessToken },
    { headers: { "Cache-Control": "no-store" } }
  );
}
