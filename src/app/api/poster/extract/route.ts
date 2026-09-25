import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";


const PROMPT = `This is a photo of a festival or concert poster. List every performing artist or band name visible on it, in the order they appear (largest/headliner text first is fine, but don't guess at an order you can't see).

Reply with ONLY a JSON array of strings — no markdown code fences, no explanation, nothing else. Exclude venue names, dates, city names, sponsor logos, ticket/box-office text, and stage names. If you can't confidently read any artist names, reply with an empty array [].

Example valid response: ["Artist One", "Artist Two", "Artist Three"]`;

export async function POST(req: NextRequest) {
  const apiKey = getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "poster_reading_not_configured" }, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const imageBase64 = body?.imageBase64 as string | undefined;
  const mediaType = (body?.mediaType as string | undefined) || "image/jpeg";

  if (!imageBase64) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Poster reading failed: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = (data.content || []).find((b: any) => b.type === "text")?.text || "[]";
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let names: string[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        names = parsed.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
      }
    } catch {
      return NextResponse.json({ error: "Couldn't parse the poster reading response.", names: [] }, { status: 200 });
    }

    return NextResponse.json({ names });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
