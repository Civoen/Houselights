"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { EqSpinner } from "@/components/EqSpinner";
import { useRotatingText } from "@/lib/useRotatingText";
import { createOrUpdatePlaylist, defaultPlaylistName, defaultPlaylistDescription } from "@/lib/createPlaylist";
import { resizeImageForSpotifyCover } from "@/lib/resizeImage";
import { generateWordmarkCover, COVER_BACKGROUND_SWATCHES } from "@/lib/coverGenerator";
import { SegmentedControl } from "@/components/SegmentedControl";
import { copy } from "@/lib/copy";

const CREATING_PHRASES = copy.create.creatingPhrases;

export default function CreatePage() {
  const router = useRouter();
  const {
    lineup,
    eventDate,
    playlist,
    playlistName,
    playlistDescription,
    coverImageBase64,
    setPlaylistMeta,
    setCoverImage,
    editingPlaylistId,
    resumedDraftId,
  } = useLineup();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(playlistName);
  const [description, setDescription] = useState(playlistDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverTab, setCoverTab] = useState<"upload" | "generate">("upload");
  const [genBackground, setGenBackground] = useState(COVER_BACKGROUND_SWATCHES[0].color);
  const [genArtistIds, setGenArtistIds] = useState<string[]>([]);
  const [genPreview, setGenPreview] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const creatingText = useRotatingText(submitting, CREATING_PHRASES, 1200);

  useEffect(() => {
    const artists = lineup.map((a) => a.artist.name);
    if (!name) {
      setName(defaultPlaylistName(artists[0]));
    }
    if (!description) {
      setDescription(defaultPlaylistDescription(artists));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coverModalOpen || coverTab !== "generate") return;
    let cancelled = false;
    const names = genArtistIds
      .map((id) => lineup.find((a) => a.artist.id === id)?.artist.name)
      .filter((n): n is string => !!n);
    generateWordmarkCover({ backgroundColor: genBackground, lines: names }).then((base64) => {
      if (!cancelled) setGenPreview(base64);
    });
    return () => {
      cancelled = true;
    };
  }, [coverModalOpen, coverTab, genBackground, genArtistIds, lineup]);

  async function handleUseGenerated() {
    setGenLoading(true);
    setCoverError(null);
    try {
      const names = genArtistIds
        .map((id) => lineup.find((a) => a.artist.id === id)?.artist.name)
        .filter((n): n is string => !!n);
      const base64 = await generateWordmarkCover({ backgroundColor: genBackground, lines: names });
      setCoverImage(base64);
      setCoverModalOpen(false);
    } catch {
      setCoverError(copy.create.coverImageError);
    } finally {
      setGenLoading(false);
    }
  }

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
      setCoverModalOpen(false);
    } catch {
      setCoverError(copy.create.coverImageError);
    }
  }

  async function handleDone(forceNew = false) {
    setSubmitting(true);
    setError(null);
    setPlaylistMeta(name, description);
    const isEditing = !!editingPlaylistId && !forceNew;
    try {
      const successPath = await createOrUpdatePlaylist({
        name,
        description,
        coverImageBase64,
        playlist,
        lineup,
        eventDate,
        editingPlaylistId,
        resumedDraftId,
        forceNew,
      });
      router.push(successPath);
    } catch (e: any) {
      setError(e.message || `Couldn't ${isEditing ? "save" : "create"} the playlist. Try again.`);
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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {editingPlaylistId ? copy.create.editTitle : copy.create.title}
        </h1>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <button
          onClick={() => setCoverModalOpen(true)}
          className="w-full flex items-center gap-3 bg-surface rounded-2xl p-3 mb-4 shadow-[0_10px_24px_-16px_rgba(10,31,38,0.25)] transition-transform duration-150 active:scale-[0.98]"
        >
          <div
            className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal to-green flex-shrink-0 bg-cover bg-center"
            style={coverImageBase64 ? { backgroundImage: `url(data:image/jpeg;base64,${coverImageBase64})` } : undefined}
          />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-bold">{coverImageBase64 ? copy.create.changeCover : copy.create.addCover}</div>
            <div className="text-xs text-faint mt-0.5">{copy.create.coverHint}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-faint flex-shrink-0">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />

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

      {coverModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-bg flex flex-col animate-fade-slide-up"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
          <div className="px-6 pt-6 pb-2 flex items-center justify-between flex-shrink-0 max-w-lg mx-auto w-full">
            <h2 className="font-display text-xl font-bold">{copy.create.coverModalTitle}</h2>
            <button
              onClick={() => setCoverModalOpen(false)}
              aria-label={copy.common.closeLabel}
              className="w-9 h-9 rounded-xl bg-surfaceAlt text-muted flex items-center justify-center transition-transform duration-150 active:scale-90"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pt-3 flex-shrink-0 max-w-lg mx-auto w-full">
            <SegmentedControl
              value={coverTab}
              onChange={(v) => setCoverTab(v as "upload" | "generate")}
              options={[
                { id: "upload", label: copy.create.uploadTab },
                { id: "generate", label: copy.create.generateTab },
              ]}
              className="mb-4"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-[calc(52px+16px+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
            {coverTab === "upload" && (
              <>
                <button
                  onClick={() => fileInput.current?.click()}
                  className="w-full aspect-square rounded-2xl bg-gradient-to-br from-teal to-green relative overflow-hidden shadow-[0_16px_36px_-16px_rgba(17,80,103,0.5)] flex items-center justify-center transition-transform duration-200 active:scale-[0.99]"
                  style={
                    coverImageBase64
                      ? { backgroundImage: `url(data:image/jpeg;base64,${coverImageBase64})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  {!coverImageBase64 && <span className="text-white text-sm font-bold">{copy.create.uploadPrompt}</span>}
                </button>
                <div className="flex flex-col gap-2 mt-3">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="w-full py-3 rounded-xl bg-surfaceAlt text-muted text-sm font-bold transition-transform duration-150 active:scale-[0.98]"
                  >
                    {coverImageBase64 ? copy.create.replaceCoverButton : copy.create.uploadCoverButton}
                  </button>
                  {coverImageBase64 && (
                    <button
                      onClick={() => {
                        setCoverImage(undefined);
                        setCoverError(null);
                      }}
                      className="w-full py-3 rounded-xl bg-surfaceAlt text-red-500 text-sm font-bold transition-all duration-150 hover:bg-red-50 active:scale-[0.98]"
                    >
                      {copy.create.deleteCoverButton}
                    </button>
                  )}
                </div>
              </>
            )}

            {coverTab === "generate" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)]">
                    {genPreview ? (
                      <img src={`data:image/jpeg;base64,${genPreview}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full" style={{ background: genBackground }} />
                    )}
                  </div>
                  <p className="text-xs text-faint flex-1">{copy.create.generatePreviewNote}</p>
                </div>

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">{copy.create.backgroundLabel}</div>
                <div className="grid grid-cols-8 gap-1.5 mb-4">
                  {COVER_BACKGROUND_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      onClick={() => setGenBackground(sw.color)}
                      aria-label={sw.label}
                      className="aspect-square rounded-lg transition-transform duration-150 active:scale-95"
                      style={{
                        background: sw.color,
                        boxShadow: genBackground === sw.color ? "0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)" : "none",
                      }}
                    />
                  ))}
                </div>

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-1">{copy.create.artistsToIncludeLabel}</div>
                <p className="text-xs text-faint mb-2">{copy.create.artistsToIncludeNote}</p>
                <div className="flex flex-col gap-2.5">
                  {lineup.map((entry) => {
                    const selected = genArtistIds.includes(entry.artist.id);
                    const disabled = !selected && genArtistIds.length >= 4;
                    return (
                      <button
                        key={entry.artist.id}
                        disabled={disabled}
                        onClick={() =>
                          setGenArtistIds((prev) =>
                            selected ? prev.filter((id) => id !== entry.artist.id) : [...prev, entry.artist.id]
                          )
                        }
                        className={
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150 active:scale-[0.98] " +
                          (selected ? "bg-grad text-white" : "bg-surface text-ink") +
                          (disabled ? " opacity-40" : "")
                        }
                      >
                        <div
                          className={
                            "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 " +
                            (selected ? "bg-white/25 border-white" : "border-lineStrong")
                          }
                        >
                          {selected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-base font-bold truncate">{entry.artist.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {coverError && <p className="text-xs text-red-600 mt-3">{coverError}</p>}
          </div>

          {coverTab === "generate" && (
            <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg mx-auto">
              <GradientButton onClick={handleUseGenerated} disabled={genLoading} className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]">
                {genLoading ? <EqSpinner /> : copy.create.useThisCover}
              </GradientButton>
            </div>
          )}
          </div>,
          document.body
        )}

      <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg mx-auto">
        {editingPlaylistId && !submitting && (
          <button
            onClick={() => handleDone(true)}
            className="block w-full text-center text-xs font-bold text-muted mb-2 underline decoration-dotted underline-offset-4"
          >
            {copy.create.saveAsNew}
          </button>
        )}
        <GradientButton
          onClick={() => handleDone(false)}
          disabled={submitting || !name.trim()}
          className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]"
        >
          {submitting ? (
            <>
              <EqSpinner />
              {creatingText}
            </>
          ) : editingPlaylistId ? (
            copy.create.saveChanges
          ) : (
            copy.create.doneButton
          )}
        </GradientButton>
      </div>
    </main>
  );
}
