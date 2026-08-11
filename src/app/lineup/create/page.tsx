"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { EqSpinner } from "@/components/EqSpinner";
import { useRotatingText } from "@/lib/useRotatingText";
import { addEvent, getAllEvents } from "@/lib/eventHistory";
import { resizeImageForSpotifyCover } from "@/lib/resizeImage";
import { copy } from "@/lib/copy";

const CREATING_PHRASES = copy.create.creatingPhrases;

export default function CreatePage() {
  const router = useRouter();
  const { lineup, eventDate, playlist, playlistName, playlistDescription, coverImageBase64, setPlaylistMeta, setCoverImage, reset } =
    useLineup();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(playlistName);
  const [description, setDescription] = useState(playlistDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const creatingText = useRotatingText(submitting, CREATING_PHRASES, 1200);

  useEffect(() => {
    if (!name) {
      const artists = Array.from(new Set(playlist.map((t) => t.artist)));
      const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      setName(artists[0] ? `${artists[0]} — ${today}` : `My playlist — ${today}`);
    }
    if (!description) {
      const artists = Array.from(new Set(playlist.map((t) => t.artist)));
      setDescription(`Prepped with Houselights · ${artists.join(", ")}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError(null);
    try {
      // Spotify's cover-image endpoint requires a genuine JPEG under 256KB.
      // A raw phone photo is neither guaranteed to be JPEG-encoded (PNG is
      // also accepted here) nor anywhere near that size — this iteratively
      // resizes/re-encodes until it actually fits the limit, rather than
      // picking one fixed size and hoping a real photo happens to be small
      // enough (a single fixed 1400px/85%-quality encode often isn't).
      const base64 = await resizeImageForSpotifyCover(file);
      setCoverImage(base64);
    } catch {
      setCoverError("Couldn't use that image — try a different one.");
    }
  }

  async function handleDone() {
    setSubmitting(true);
    setError(null);
    setPlaylistMeta(name, description);
    const isFirstEver = getAllEvents().length === 0;
    try {
      const res = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trackUris: playlist.map((t) => t.uri),
          coverImageBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong creating the playlist.");
      const url = json.playlist?.url as string;
      const playlistId = json.playlist?.id as string;
      const coverFailed = !!coverImageBase64 && json.playlist?.coverUploaded === false;
      const coverErrorStatus = json.playlist?.coverErrorStatus as number | undefined;
      const coverErrorBody = json.playlist?.coverErrorBody as string | undefined;
      const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);
      addEvent({
        id: playlistId || crypto.randomUUID(),
        name,
        url: url || "",
        trackCount: playlist.length,
        totalMinutes: Math.round(totalMs / 60000),
        artistNames: Array.from(new Set(playlist.map((t) => t.artist))),
        headliner:
          lineup[0]?.artist ||
          { id: playlist[0]?.artistId || "", name: playlist[0]?.artist || "Unknown", genres: [] },
        eventDate: eventDate || undefined,
        createdAt: new Date().toISOString(),
        tracks: playlist,
      });
      router.push(
        `/success?url=${encodeURIComponent(url || "")}&name=${encodeURIComponent(name)}${isFirstEver ? "&first=1" : ""}${coverFailed ? "&coverFailed=1" : ""}${coverFailed && coverErrorStatus ? `&coverErrorStatus=${coverErrorStatus}` : ""}${coverFailed && coverErrorBody ? `&coverErrorBody=${encodeURIComponent(coverErrorBody)}` : ""}`
      );
    } catch (e: any) {
      setError(e.message || "Couldn't create the playlist. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen pb-40 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-xl bg-surfaceAlt text-muted text-xl flex items-center justify-center transition-transform duration-150 active:scale-90 mb-3"
        >
          ‹
        </button>
        <h1 className="font-display text-3xl font-bold tracking-tight">{copy.create.title}</h1>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full aspect-square rounded-2xl bg-gradient-to-br from-teal to-green relative overflow-hidden mb-5 block shadow-[0_16px_36px_-16px_rgba(17,80,103,0.5)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          style={
            coverImageBase64
              ? { backgroundImage: `url(data:image/jpeg;base64,${coverImageBase64})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <span className="absolute bottom-3 right-3 bg-black/55 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/70">
            {coverImageBase64 ? copy.create.changeCover : copy.create.addCover}
          </span>
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />
        {coverError && <p className="text-xs text-red-600 -mt-3 mb-4">{coverError}</p>}

        <label className="block text-xs font-extrabold uppercase tracking-wide text-faint mb-1.5">
          {copy.create.playlistNameLabel}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface rounded-xl px-4 py-3 text-[16px] font-semibold mb-4 outline-none shadow-[0_6px_18px_-12px_rgba(10,31,38,0.2)] transition-shadow focus:ring-2 focus:ring-accent/30"
        />

        <label className="block text-xs font-extrabold uppercase tracking-wide text-faint mb-1.5">
          {copy.create.descriptionLabel}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-surface rounded-xl px-4 py-3 text-[16px] mb-2 outline-none resize-none shadow-[0_6px_18px_-12px_rgba(10,31,38,0.2)] transition-shadow focus:ring-2 focus:ring-accent/30"
        />

        {error && <p className="text-xs text-red-600 mt-2 animate-fade-slide-up">{error}</p>}
      </div>

      <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg mx-auto">
        <GradientButton
          onClick={handleDone}
          disabled={submitting || !name.trim()}
          className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]"
        >
          {submitting ? (
            <>
              <EqSpinner />
              {creatingText}
            </>
          ) : (
            copy.create.doneButton
          )}
        </GradientButton>
      </div>
    </main>
  );
}
