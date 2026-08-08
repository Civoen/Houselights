"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { Spinner } from "@/components/Spinner";

export default function CreatePage() {
  const router = useRouter();
  const { playlist, playlistName, playlistDescription, coverImageBase64, setPlaylistMeta, setCoverImage, reset } =
    useLineup();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(playlistName);
  const [description, setDescription] = useState(playlistDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCoverImage(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function handleDone() {
    setSubmitting(true);
    setError(null);
    setPlaylistMeta(name, description);
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
      router.push(`/success?url=${encodeURIComponent(url || "")}&name=${encodeURIComponent(name)}`);
    } catch (e: any) {
      setError(e.message || "Couldn't create the playlist. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen pb-40 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-150 active:scale-90 hover:bg-white/30"
          >
            ‹
          </button>
          <h1 className="font-display text-xl font-bold">New playlist</h1>
        </div>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full aspect-square rounded-2xl bg-gradient-to-br from-teal to-green relative overflow-hidden mb-5 block transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          style={
            coverImageBase64
              ? { backgroundImage: `url(data:image/jpeg;base64,${coverImageBase64})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <span className="absolute bottom-3 right-3 bg-black/55 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/70">
            {coverImageBase64 ? "Change cover" : "Add cover"}
          </span>
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />

        <label className="block text-xs font-extrabold uppercase tracking-wide text-faint mb-1.5">
          Playlist name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface border border-lineStrong rounded-xl px-4 py-3 text-sm font-semibold mb-4 outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
        />

        <label className="block text-xs font-extrabold uppercase tracking-wide text-faint mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-surface border border-lineStrong rounded-xl px-4 py-3 text-sm mb-2 outline-none resize-none transition-shadow focus:ring-2 focus:ring-teal/30"
        />

        {error && <p className="text-xs text-red-600 mt-2 animate-fade-slide-up">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-surfaceAlt/95 backdrop-blur border-t border-line px-6 pt-4 shadow-[0_-8px_24px_-12px_rgba(20,22,20,0.18)]" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="max-w-lg mx-auto">
          <GradientButton onClick={handleDone} disabled={submitting || !name.trim()} glow={!submitting && !!name.trim()}>
            {submitting ? (
              <>
                <Spinner />
                Creating...
              </>
            ) : (
              "Done"
            )}
          </GradientButton>
        </div>
      </div>
    </main>
  );
}
