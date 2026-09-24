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
import {
  generateStatCover,
  formatSupportLine,
  COVER_PALETTES,
  COVER_TEXTURES,
  CoverPaletteId,
  CoverAppearance,
  CoverTexture,
} from "@/lib/coverGenerator";
import { fmtMinutes, formatEventDateShort } from "@/lib/format";
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
  const [genPalette, setGenPalette] = useState<CoverPaletteId>("default");
  const [genAppearance, setGenAppearance] = useState<CoverAppearance>("dark");
  const [genTexture, setGenTexture] = useState<CoverTexture>("rings");
  // The headliner (lineup[0]) is always shown; this holds which of the
  // *other* artists are named in the smaller support line below it —
  // defaults to the next couple so the first preview isn't empty.
  const [genArtistIds, setGenArtistIds] = useState<string[]>(() => lineup.slice(1, 3).map((a) => a.artist.id));
  const [genPreview, setGenPreview] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const creatingText = useRotatingText(submitting, CREATING_PHRASES, 1200);
  const headlinerName = lineup[0]?.artist.name || "";
  const supportCandidates = lineup.slice(1);
  const totalMin = Math.round(playlist.reduce((s, t) => s + t.durationMs, 0) / 60000);
  const coverDateLabel = formatEventDateShort(eventDate) ?? copy.create.coverDateUnset;

  useEffect(() => {
    const artists = lineup.map((a) => a.artist.name);
    if (!name) {
      setName(defaultPlaylistName(artists[0], eventDate));
    }
    if (!description) {
      setDescription(defaultPlaylistDescription(artists));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coverModalOpen || coverTab !== "generate" || !headlinerName) return;
    let cancelled = false;
    const supportNames = supportCandidates
      .filter((a) => genArtistIds.includes(a.artist.id))
      .map((a) => a.artist.name);
    generateStatCover({
      headliner: headlinerName,
      supportNames,
      dateLabel: coverDateLabel,
      songCount: playlist.length,
      totalMinutesLabel: fmtMinutes(totalMin),
      palette: genPalette,
      appearance: genAppearance,
      texture: genTexture,
    }).then((base64) => {
      if (!cancelled) setGenPreview(base64);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverModalOpen, coverTab, genPalette, genAppearance, genTexture, genArtistIds, headlinerName, playlist.length, totalMin, coverDateLabel]);

  async function handleUseGenerated() {
    setGenLoading(true);
    setCoverError(null);
    try {
      const supportNames = supportCandidates
        .filter((a) => genArtistIds.includes(a.artist.id))
        .map((a) => a.artist.name);
      const base64 = await generateStatCover({
        headliner: headlinerName,
        supportNames,
        dateLabel: coverDateLabel,
        songCount: playlist.length,
        totalMinutesLabel: fmtMinutes(totalMin),
        palette: genPalette,
        appearance: genAppearance,
        texture: genTexture,
      });
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
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg lg:max-w-3xl mx-auto w-full">
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

      <div className="px-6 py-5 max-w-lg lg:max-w-3xl mx-auto">
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
          <div className="px-6 pt-6 pb-2 flex items-center justify-between flex-shrink-0 max-w-lg lg:max-w-3xl mx-auto w-full">
            <h2 className="font-display text-xl font-bold">{copy.create.coverModalTitle}</h2>
            <button
              onClick={() => setCoverModalOpen(false)}
              aria-label={copy.common.closeLabel}
              className="w-9 h-9 rounded-xl bg-surfaceAlt text-muted flex items-center justify-center transition-transform duration-150 active:scale-90"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pt-3 flex-shrink-0 max-w-lg lg:max-w-3xl mx-auto w-full">
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

          <div className="flex-1 overflow-y-auto px-6 pb-[calc(52px+16px+env(safe-area-inset-bottom))] max-w-lg lg:max-w-3xl mx-auto w-full">
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
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] bg-surfaceAlt">
                    {genPreview && <img src={`data:image/jpeg;base64,${genPreview}`} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <p className="text-xs text-faint flex-1">{copy.create.generatePreviewNote}</p>
                </div>

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">{copy.create.paletteLabel}</div>
                <div className="flex flex-col gap-2 mb-4">
                  {COVER_PALETTES.map((p) => {
                    const active = genPalette === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setGenPalette(p.id)}
                        className={
                          "flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-150 active:scale-[0.98] " +
                          (active ? "bg-grad text-white" : "bg-surface text-ink")
                        }
                      >
                        <span>
                          <span className="block text-sm font-bold">{p.label}</span>
                          <span className={"block text-xs mt-0.5 " + (active ? "text-white/75" : "text-faint")}>{p.note}</span>
                        </span>
                        {active && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">{copy.create.backgroundLabel}</div>
                <SegmentedControl
                  value={genAppearance}
                  onChange={(v) => setGenAppearance(v as CoverAppearance)}
                  options={[
                    { id: "light", label: copy.create.appearanceLight },
                    { id: "dark", label: copy.create.appearanceDark },
                  ]}
                  className="mb-4"
                />

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">{copy.create.textureLabel}</div>
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {COVER_TEXTURES.map((t) => {
                    const active = genTexture === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setGenTexture(t.id)}
                        className={
                          "py-2.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 " +
                          (active ? "bg-grad text-white" : "bg-surface text-muted")
                        }
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-1">{copy.create.headlinerLabel}</div>
                <div className="px-4 py-3 rounded-xl bg-surfaceAlt text-sm font-bold mb-4 truncate">
                  {headlinerName || copy.create.artistsToIncludeLabel}
                </div>

                {supportCandidates.length > 0 && (
                  <>
                    <div className="text-xs font-extrabold uppercase tracking-wide text-faint mb-1">{copy.create.supportArtistsLabel}</div>
                    <p className="text-xs text-faint mb-2">{copy.create.supportArtistsNote}</p>
                    <div className="flex flex-col gap-2.5">
                      {supportCandidates.map((entry) => {
                        const selected = genArtistIds.includes(entry.artist.id);
                        return (
                          <button
                            key={entry.artist.id}
                            onClick={() =>
                              setGenArtistIds((prev) =>
                                selected ? prev.filter((id) => id !== entry.artist.id) : [...prev, entry.artist.id]
                              )
                            }
                            className={
                              "flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150 active:scale-[0.98] " +
                              (selected ? "bg-grad text-white" : "bg-surface text-ink")
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
              </>
            )}

            {coverError && <p className="text-xs text-red-600 mt-3">{coverError}</p>}
          </div>

          {coverTab === "generate" && (
            <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg lg:max-w-3xl mx-auto">
              <GradientButton onClick={handleUseGenerated} disabled={genLoading} className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]">
                {genLoading ? <EqSpinner /> : copy.create.useThisCover}
              </GradientButton>
            </div>
          )}

          {coverTab === "upload" && (
            <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg lg:max-w-3xl mx-auto">
              <button
                onClick={() => {
                  setCoverModalOpen(false);
                  router.back();
                }}
                className="w-full py-3.5 rounded-2xl bg-surface text-muted text-sm font-bold shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] transition-all duration-150 active:scale-[0.98]"
              >
                {copy.create.backToPreview}
              </button>
            </div>
          )}
          </div>,
          document.body
        )}

      <div className="fixed left-6 right-6 bottom-[calc(72px+24px+env(safe-area-inset-bottom))] z-20 max-w-lg lg:max-w-3xl mx-auto">
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
