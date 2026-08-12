// Generates a Spotify playlist cover client-side — an oversized, rotated
// wordmark of one to four artist names on a solid background. Four is the
// practical ceiling for a real festival-style lineup while keeping each
// name legible; past that the rotated text would need to shrink small
// enough that "oversized" stops being true, so the style itself caps it
// rather than the limit being arbitrary.
//
// This is a real advantage over the photo-upload path, not just a
// different option — it's rendered directly onto a canvas at a size and
// quality chosen specifically to fit Spotify's 256KB/JPEG requirement, so
// there's no adaptive shrink-and-retry loop needed the way a real photo
// requires.

const CANVAS_SIZE = 640;
const ROTATION_DEG = -8;
const TARGET_TEXT_WIDTH = 760; // wider than the canvas — the intended "bleed"
const MAX_LINES = 4;

export interface WordmarkCoverOptions {
  backgroundColor: string;
  lines: string[]; // 0-4 strings — 1 renders twice (matching the liked example), 0 renders just the background
}

// Curated dark, saturated backgrounds only — the text is always rendered
// in white, so contrast has to be guaranteed by constraining the palette
// rather than by trying to compute contrast against an arbitrary color.
export const COVER_BACKGROUND_SWATCHES = [
  { id: "navy", color: "#0A1F26", label: "Navy" },
  { id: "teal", color: "#0D3C4D", label: "Teal" },
  { id: "indigo", color: "#1B1F3B", label: "Indigo" },
  { id: "purple", color: "#2A1B3D", label: "Purple" },
  { id: "crimson", color: "#3D1420", label: "Crimson" },
  { id: "forest", color: "#12321F", label: "Forest" },
  { id: "charcoal", color: "#1A1A1A", label: "Charcoal" },
  { id: "rust", color: "#3D2410", label: "Rust" },
];

async function ensureFontLoaded() {
  // Canvas text rendering needs the font to already be loaded in the
  // document's font set — unlike CSS, it won't wait or fall back mid-draw.
  await document.fonts.load("900 100px Poppins");
  await document.fonts.ready;
}

// Font size scales linearly with rendered text width for a fixed string,
// so one measurement at a reference size gives the exact size needed to
// hit the target width directly — no iterative search required.
function fitFontSizeToWidth(ctx: CanvasRenderingContext2D, text: string, targetWidth: number): number {
  const reference = 100;
  ctx.font = `900 ${reference}px Poppins`;
  const measured = ctx.measureText(text).width || 1;
  const fitted = (targetWidth / measured) * reference;
  return Math.min(260, Math.max(50, fitted));
}

export async function generateWordmarkCover(options: WordmarkCoverOptions): Promise<string> {
  await ensureFontLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const lines = options.lines.filter((l) => l.trim().length > 0);
  const displayLines = lines.length === 1 ? [lines[0], lines[0]] : lines.slice(0, MAX_LINES);
  const n = displayLines.length;

  if (n > 0) {
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate((ROTATION_DEG * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Each line is sized independently to fill the same target width, on
    // purpose — a short name like "KISS" and a long one like "Bring Me
    // The Horizon" are never going to look right at a matching font size,
    // and forcing them to match undersells the short ones. Lines are
    // stacked by their own actual size rather than an even shared slot,
    // so a short line's much larger height is expected to crowd or crop
    // into its neighbors — that's the poster-collage look, not a bug to
    // engineer around. Anything drawn past the canvas edge is simply
    // clipped by the canvas itself, no extra logic needed.
    const lineGap = 14;
    const fontSizes = displayLines.map((line) => fitFontSizeToWidth(ctx, line.toUpperCase(), TARGET_TEXT_WIDTH));
    const totalHeight = fontSizes.reduce((sum, size) => sum + size, 0) + lineGap * (n - 1);
    let cursorY = -totalHeight / 2;

    displayLines.forEach((line, i) => {
      const fontSize = fontSizes[i];
      ctx.font = `900 ${fontSize}px Poppins`;
      // Gradual fade from fully opaque at the top line down to ~50% by
      // the last — keeps every line legible even at 4, rather than
      // flattening straight to one fixed dim tone partway down.
      const opacity = Math.max(0.5, 0.95 - i * (0.45 / Math.max(1, n - 1)));
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      const y = cursorY + fontSize / 2;
      ctx.fillText(line.toUpperCase(), 0, y);
      cursorY += fontSize + lineGap;
    });

    ctx.restore();
  }

  // A largely flat-color image compresses well under JPEG regardless, but
  // that's an expectation, not a guarantee — check rather than assume,
  // the same caution the photo-upload path needed for a real reason.
  const MAX_BYTES = 240 * 1024;
  for (const quality of [0.85, 0.7, 0.5]) {
    const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (base64.length * 0.75 <= MAX_BYTES) return base64;
  }
  return canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
}
