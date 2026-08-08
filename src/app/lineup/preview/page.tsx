"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { AlbumArt } from "@/components/AlbumArt";
import { haptic, HAPTIC } from "@/lib/haptics";

function fmtDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function PreviewPage() {
  const router = useRouter();
  const { playlist, removeTrack, reorderTrack, addTrackToPlaylist } = useLineup();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addArtistQuery, setAddArtistQuery] = useState("");
  const [addArtistResults, setAddArtistResults] = useState<any[]>([]);
  const [chosenArtist, setChosenArtist] = useState<{ id: string; name: string } | null>(null);
  const [addTrackQuery, setAddTrackQuery] = useState("");
  const [addTrackResults, setAddTrackResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);
  const totalMin = Math.round(totalMs / 60000);
  const artistCount = new Set(playlist.map((t) => t.sourceArtistId)).size;

  async function searchArtist(q: string) {
    setAddArtistQuery(q);
    setChosenArtist(null);
    if (q.trim().length < 2) {
      setAddArtistResults([]);
      return;
    }
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      setAddArtistResults(json.artists || []);
    }
  }

  async function searchTrack(q: string) {
    setAddTrackQuery(q);
    if (!chosenArtist || q.trim().length < 2) {
      setAddTrackResults([]);
      return;
    }
    const params = new URLSearchParams({
      artistId: chosenArtist.id,
      artistName: chosenArtist.name,
      pickQuery: q,
    });
    const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setAddTrackResults(json.tracks || []);
    }
  }

  return (
    <main className="min-h-screen pb-48 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-150 active:scale-90 hover:bg-white/30"
          >
            ‹
          </button>
          <h1 className="font-display text-xl font-bold">Preview playlist</h1>
        </div>
        <p className="text-sm opacity-90 ml-10">
          {playlist.length} tracks · {totalMin} min · {artistCount} artists
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        {playlist.length === 0 && (
          <p className="text-sm text-faint text-center py-10">
            Your lineup didn't return any tracks. Go back and adjust your filters or song counts.
          </p>
        )}

        {playlist.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) { reorderTrack(dragIndex, i); haptic(HAPTIC.reorder); }
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={
              "flex items-center gap-3 py-2 border-b border-line transition-all duration-150 " +
              (dragIndex === i ? "opacity-40 scale-[0.98]" : "opacity-100 scale-100")
            }
          >
            <span className="text-faint text-sm select-none cursor-grab active:cursor-grabbing">⠿</span>
            <AlbumArt src={t.albumImage} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{t.name}</div>
              <div className="text-xs text-faint truncate">
                {t.artist}
                {t.handpicked ? " · handpicked" : ""}
              </div>
            </div>
            <span className="text-xs text-faint font-semibold flex-shrink-0">{fmtDuration(t.durationMs)}</span>
            <button
              onClick={() => { haptic(HAPTIC.remove); removeTrack(i); }}
              className="w-6 h-6 rounded-full bg-surface text-faint text-xs font-bold flex-shrink-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-2 text-sm font-bold text-teal pt-4 transition-opacity active:opacity-60"
        >
          <span className="w-6 h-6 rounded-full border border-dashed border-teal flex items-center justify-center transition-transform duration-200">
            {showAdd ? "−" : "+"}
          </span>
          Add a song
        </button>

        {showAdd && (
          <div className="mt-3 bg-surface border border-line rounded-2xl p-3 animate-fade-slide-up">
            {!chosenArtist ? (
              <>
                <input
                  autoFocus
                  value={addArtistQuery}
                  onChange={(e) => searchArtist(e.target.value)}
                  placeholder="Search an artist"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
                />
                {addArtistResults.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setChosenArtist({ id: a.id, name: a.name })}
                    className="flex items-center justify-between w-full py-1.5 text-left animate-fade-slide-up transition-opacity active:opacity-60"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs font-semibold">{a.name}</span>
                    <span className="text-[11px] text-teal font-bold">Select</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 animate-pop-in">
                  <span className="text-xs font-bold">{chosenArtist.name}</span>
                  <button onClick={() => setChosenArtist(null)} className="text-[11px] text-faint transition-opacity active:opacity-60">
                    Change
                  </button>
                </div>
                <input
                  autoFocus
                  value={addTrackQuery}
                  onChange={(e) => searchTrack(e.target.value)}
                  placeholder="Search a song title"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
                />
                {addTrackResults.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 animate-fade-slide-up"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs truncate">{t.name}</span>
                    <button
                      onClick={() => { haptic(HAPTIC.add); addTrackToPlaylist({ ...t, sourceArtistId: chosenArtist.id, handpicked: true }); }}
                      className="text-[11px] font-bold text-teal flex-shrink-0 ml-2 transition-transform duration-150 active:scale-90"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-20 bg-surfaceAlt/95 backdrop-blur border-t border-line px-6 pt-4 pb-4 shadow-[0_-8px_24px_-12px_rgba(20,22,20,0.18)]">
        <div className="max-w-lg mx-auto">
          <GradientButton onClick={() => router.push("/lineup/create")} disabled={playlist.length === 0} glow={playlist.length > 0}>
            Create playlist
          </GradientButton>
        </div>
      </div>
    </main>
  );
}
