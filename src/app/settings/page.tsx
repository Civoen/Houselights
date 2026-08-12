"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAllEvents } from "@/lib/eventHistory";
import { resetWristbandProgress } from "@/lib/wristbandTracker";
import { useColorblindMode, ColorblindMode } from "@/lib/colorblindStore";
import { useTheme } from "@/lib/themeStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildBackupPayload, backupFilename, parseBackup, applyBackup } from "@/lib/backup";
import { haptic, HAPTIC } from "@/lib/haptics";
import { copy } from "@/lib/copy";
import { PATCH_NOTES } from "@/lib/patchNotes";

type ConfirmTarget = "deleteAll" | "clearProgress" | null;

export default function SettingsPage() {
  const router = useRouter();
  const { mode: colorblindMode, setMode: setColorblindMode } = useColorblindMode();
  const { theme } = useTheme();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [doneTarget, setDoneTarget] = useState<ConfirmTarget>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportDone, setExportDone] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ data: Record<string, string>; exportedAt: string } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  function handleDeleteAllPlaylists() {
    haptic(HAPTIC.remove);
    saveAllEvents([]);
    setConfirmTarget(null);
    setDoneTarget("deleteAll");
    setTimeout(() => setDoneTarget(null), 3000);
  }

  function handleClearProgress() {
    haptic(HAPTIC.remove);
    saveAllEvents([]);
    resetWristbandProgress();
    setConfirmTarget(null);
    setDoneTarget("clearProgress");
    setTimeout(() => setDoneTarget(null), 3000);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function showExportDone() {
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  }

  async function handleExport() {
    haptic(HAPTIC.tap);
    const payload = buildBackupPayload();
    const filename = backupFilename();
    const blob = new Blob([payload], { type: "application/json" });
    const file = new File([blob], filename, { type: "application/json" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Houselights backup" });
        showExportDone();
      } catch (err: any) {
        // AbortError means the user dismissed the share sheet themselves —
        // that's a deliberate cancel, not a failure, so no fallback there.
        if (err?.name !== "AbortError") {
          downloadBlob(blob, filename);
          showExportDone();
        }
      }
      return;
    }
    downloadBlob(blob, filename);
    showExportDone();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackup(reader.result as string);
      if (!parsed) {
        setImportError(copy.settings.importInvalidFile);
        return;
      }
      setPendingImport(parsed);
    };
    reader.onerror = () => setImportError(copy.settings.importInvalidFile);
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    if (!pendingImport) return;
    haptic(HAPTIC.add);
    applyBackup(pendingImport.data);
    setPendingImport(null);
    setImporting(true);
    // Most pages only read localStorage once on mount, so a reload is the
    // simplest way to guarantee every page reflects the restored data
    // rather than showing a mix of old and new state.
    setTimeout(() => window.location.reload(), 900);
  }

  const colorblindOptions: { id: ColorblindMode; label: string; note: string }[] = [
    { id: "off", label: copy.settings.colorblindOff, note: copy.settings.colorblindOffNote },
    { id: "redGreen", label: copy.settings.colorblindRedGreen, note: copy.settings.colorblindRedGreenNote },
    { id: "blueYellow", label: copy.settings.colorblindBlueYellow, note: copy.settings.colorblindBlueYellowNote },
  ];

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-xl bg-surfaceAlt text-muted text-xl flex items-center justify-center transition-transform duration-150 active:scale-90 mb-3"
        >
          ‹
        </button>
        <h1 className="font-display text-3xl font-bold tracking-tight">{copy.settings.title}</h1>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.colorblindLabel}</div>
        <div className="bg-surface rounded-2xl p-4 mb-6 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
          <p className="text-xs text-faint mb-3">{copy.settings.colorblindNote}</p>
          <div className="flex flex-col gap-2">
            {colorblindOptions.map((opt) => {
              const active = colorblindMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    haptic(HAPTIC.tap);
                    setColorblindMode(opt.id);
                  }}
                  className={
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 active:scale-[0.98] " +
                    (active ? "bg-grad text-white" : "bg-surfaceAlt text-muted")
                  }
                >
                  <div>
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className={"text-[11px] mt-0.5 " + (active ? "text-white/80" : "text-faint")}>{opt.note}</div>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 ml-2">
                      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.appearanceLabel}</div>
        <div className="bg-surface rounded-2xl p-4 mb-6 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">
              {theme === "dark" ? copy.settings.lightsDown : copy.settings.lightsUp}
            </div>
            <div className="text-xs text-faint mt-0.5">{copy.settings.appearanceNote}</div>
          </div>
          <ThemeToggle className="w-11 h-11 rounded-xl bg-surfaceAlt text-muted flex-shrink-0" />
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.accountLabel}</div>
        <div className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
          <div className="flex items-center gap-2 mb-1">
            <span className={"w-2 h-2 rounded-full " + (connected ? "bg-green" : "bg-faint")} />
            <span className="text-sm font-bold">
              {connected === null ? copy.settings.checking : connected ? copy.settings.connected : copy.settings.notConnected}
            </span>
          </div>
          <p className="text-xs text-faint">
            {connected
              ? copy.settings.connectedNote
              : copy.settings.notConnectedNote}
          </p>
        </div>

        {connected && (
          <div className="flex flex-col gap-2 mb-3">
            <a
              href="/api/auth/login?switch=1"
              className="w-full text-center py-3 rounded-xl bg-surface text-muted text-sm font-bold shadow-[0_6px_18px_-10px_rgba(10,31,38,0.2)] transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.switchAccount}
            </a>
            <a
              href="/api/auth/logout"
              className="w-full text-center py-3 rounded-xl bg-surface text-red-500 text-sm font-bold shadow-[0_6px_18px_-10px_rgba(10,31,38,0.2)] transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.logout}
            </a>
          </div>
        )}

        <p className="text-[11px] text-faint mb-6 text-center">
          {copy.settings.switchNote}
        </p>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.backupLabel}</div>
        <div className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
          <p className="text-xs text-faint mb-3">{copy.settings.backupNote}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="w-full text-center py-3 rounded-xl bg-surfaceAlt text-muted text-sm font-bold transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.exportButton}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-center py-3 rounded-xl bg-surfaceAlt text-muted text-sm font-bold transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.importButton}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
          </div>
          {exportDone && <p className="text-xs text-green font-bold mt-3 animate-fade-slide-up">{copy.settings.exportDone}</p>}
          {importError && <p className="text-xs text-red-600 mt-3 animate-fade-slide-up">{importError}</p>}
          {pendingImport && !importing && (
            <div className="mt-3 pt-3 border-t border-line animate-fade-slide-up">
              <p className="text-xs text-faint mb-2">
                {copy.settings.importConfirmPrompt}
                {pendingImport.exportedAt ? ` (${new Date(pendingImport.exportedAt).toLocaleDateString()})` : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPendingImport(null)}
                  className="text-xs font-bold text-muted flex-1 py-2 rounded-lg bg-surfaceAlt transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.cancel}
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="text-xs font-bold text-white flex-1 py-2 rounded-lg bg-grad transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.importConfirmButton}
                </button>
              </div>
            </div>
          )}
          {importing && <p className="text-xs text-faint mt-3 animate-fade-slide-up">{copy.settings.importingMessage}</p>}
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2 mt-6">{copy.settings.dangerLabel}</div>
        <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] overflow-hidden mb-3">
          <div className="p-4 border-b border-line">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{copy.settings.deleteAllTitle}</div>
                <div className="text-xs text-faint mt-0.5">{copy.settings.deleteAllNote}</div>
              </div>
              <button
                onClick={() => setConfirmTarget(confirmTarget === "deleteAll" ? null : "deleteAll")}
                className="text-xs font-bold text-red-500 flex-shrink-0 px-3 py-2 rounded-xl bg-red-50 transition-transform duration-150 active:scale-95"
              >
                {copy.settings.deleteAllButton}
              </button>
            </div>
            {confirmTarget === "deleteAll" && (
              <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 animate-fade-slide-up">
                <p className="text-xs text-faint flex-1">{copy.settings.confirmPrompt}</p>
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="text-xs font-bold text-muted flex-shrink-0 px-3 py-1.5 rounded-lg bg-surfaceAlt transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.cancel}
                </button>
                <button
                  onClick={handleDeleteAllPlaylists}
                  className="text-xs font-bold text-white flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-500 transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.confirmDelete}
                </button>
              </div>
            )}
            {doneTarget === "deleteAll" && (
              <p className="text-xs text-green font-bold mt-2 animate-fade-slide-up">{copy.settings.deletedConfirmation}</p>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{copy.settings.clearProgressTitle}</div>
                <div className="text-xs text-faint mt-0.5">{copy.settings.clearProgressNote}</div>
              </div>
              <button
                onClick={() => setConfirmTarget(confirmTarget === "clearProgress" ? null : "clearProgress")}
                className="text-xs font-bold text-red-500 flex-shrink-0 px-3 py-2 rounded-xl bg-red-50 transition-transform duration-150 active:scale-95"
              >
                {copy.settings.clearProgressButton}
              </button>
            </div>
            {confirmTarget === "clearProgress" && (
              <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 animate-fade-slide-up">
                <p className="text-xs text-faint flex-1">{copy.settings.confirmPromptProgress}</p>
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="text-xs font-bold text-muted flex-shrink-0 px-3 py-1.5 rounded-lg bg-surfaceAlt transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.cancel}
                </button>
                <button
                  onClick={handleClearProgress}
                  className="text-xs font-bold text-white flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-500 transition-transform duration-150 active:scale-95"
                >
                  {copy.settings.confirmDelete}
                </button>
              </div>
            )}
            {doneTarget === "clearProgress" && (
              <p className="text-xs text-green font-bold mt-2 animate-fade-slide-up">{copy.settings.clearedConfirmation}</p>
            )}
          </div>
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2 mt-6">{copy.settings.patchNotesLabel}</div>
        <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] overflow-hidden">
          <button
            onClick={() => {
              haptic(HAPTIC.tap);
              setNotesOpen((v) => !v);
            }}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm font-bold">
              {copy.settings.currentVersionPrefix} {PATCH_NOTES[0]?.version}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="transition-transform duration-200 text-faint flex-shrink-0"
              style={{ transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {notesOpen && (
            <div className="px-4 pb-4 animate-fade-slide-up">
              {PATCH_NOTES.map((v, vi) => (
                <div key={v.version} className={vi > 0 ? "mt-4 pt-4 border-t border-line" : ""}>
                  <div className="text-xs font-extrabold text-accent mb-1.5">{v.version}</div>
                  <ul className="space-y-1">
                    {v.notes.map((note, ni) => (
                      <li key={ni} className="text-xs text-faint flex gap-2">
                        <span className="text-accent flex-shrink-0">·</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
