import { NextResponse } from "next/server";
import { getValidAccessToken, getSpotifyUserId } from "@/lib/spotify";
import { getKV } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const kv = getKV("HOUSELIGHTS_KV");
  if (!kv) {
    return NextResponse.json(
      { error: "Sync isn't set up yet — the HOUSELIGHTS_KV binding is missing from this deployment." },
      { status: 501 }
    );
  }

  try {
    const userId = await getSpotifyUserId(accessToken);
    const raw = await kv.get(`sync:${userId}`);
    if (!raw) return NextResponse.json({ record: null });
    const record = JSON.parse(raw);
    return NextResponse.json({ record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sync failed." }, { status: 502 });
  }
}
