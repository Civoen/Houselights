import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, getSpotifyUserId } from "@/lib/spotify";
import { getKV } from "@/lib/env";

// Manual cross-device sync — not automatic. Pushes the same data shape
// Export already produces up to Cloudflare KV, keyed by the current
// Spotify account's user ID, so "Sync to cloud" on one device and "Sync
// from cloud" on another moves everything (playlists history, drafts,
// wristband progress, theme, colorblind mode) without needing to email
// yourself a backup file.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const kv = getKV("HOUSELIGHTS_KV");
  if (!kv) {
    return NextResponse.json(
      { error: "Sync isn't set up yet — the HOUSELIGHTS_KV binding is missing from this deployment." },
      { status: 501 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body?.app !== "houselights" || typeof body?.data !== "object" || body.data === null) {
    return NextResponse.json({ error: "Not a valid Houselights backup payload." }, { status: 400 });
  }

  try {
    const userId = await getSpotifyUserId(accessToken);
    const record = {
      app: "houselights",
      exportVersion: 1,
      syncedAt: new Date().toISOString(),
      data: body.data,
    };
    await kv.put(`sync:${userId}`, JSON.stringify(record));
    return NextResponse.json({ syncedAt: record.syncedAt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sync failed." }, { status: 502 });
  }
}
