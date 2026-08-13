// Every localStorage key the app writes, in one place — a backup is just
// these raw string values round-tripped through JSON, so import doesn't
// need to understand the internal shape of any of them.
const BACKUP_KEYS = [
  "houselights_events_v1",
  "houselights_drafts_v1",
  "houselights_wristbands_seen_v1",
  "houselights_wristbands_earned_v1",
  "houselights_theme",
  "houselights_colorblind_mode",
  "houselights_lineup_v4",
];

interface BackupFile {
  app: "houselights";
  exportVersion: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function buildBackupPayload(): string {
  const data: Record<string, string> = {};
  BACKUP_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v !== null) data[k] = v;
  });
  const file: BackupFile = { app: "houselights", exportVersion: 1, exportedAt: new Date().toISOString(), data };
  return JSON.stringify(file, null, 2);
}

export function backupFilename(): string {
  return `houselights-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// Parses and validates a backup file's contents without applying it —
// callers show a confirmation using the returned summary before calling
// applyBackup, since this overwrites whatever's currently saved.
export function parseBackup(text: string): { data: Record<string, string>; exportedAt: string } | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.app !== "houselights" || typeof parsed?.data !== "object" || parsed.data === null) return null;
    return { data: parsed.data, exportedAt: parsed.exportedAt || "" };
  } catch {
    return null;
  }
}

export function applyBackup(data: Record<string, string>) {
  BACKUP_KEYS.forEach((k) => {
    if (typeof data[k] === "string") {
      localStorage.setItem(k, data[k]);
    }
  });
}
