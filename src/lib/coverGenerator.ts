// Generates a Spotify playlist cover client-side.
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
  await document.fonts.load("700 100px Poppins");
  await document.fonts.load("600 100px Poppins");
  await document.fonts.ready;
}

// Font size scales linearly with rendered text width for a fixed string,
// so one measurement at a reference size gives the exact size needed to
// hit the target width directly — no iterative search required.
function fitFontSizeToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  targetWidth: number,
  weight = 900,
  min = 50,
  max = 260
): number {
  const reference = 100;
  ctx.font = `${weight} ${reference}px Poppins`;
  const measured = ctx.measureText(text).width || 1;
  const fitted = (targetWidth / measured) * reference;
  return Math.min(max, Math.max(min, fitted));
}

// Fits the headliner to one line at a large size when it can; when the
// name is long enough that fitting it on one line would shrink it past
// SINGLE_LINE_MIN, it wraps onto two lines instead (split at the word
// boundary that balances the two lines best) and fits the wider of the
// two lines to the target width — so a long name stays big by breaking,
// rather than by shrinking small enough to look like an afterthought.
interface HeadlinerLayout {
  lines: string[];
  size: number;
}

function layoutHeadliner(
  ctx: CanvasRenderingContext2D,
  text: string,
  targetWidth: number,
  weight = 900,
  singleLineMin = 46,
  singleLineMax = 92,
  twoLineMin = 30,
  twoLineMax = 84
): HeadlinerLayout {
  const reference = 100;
  ctx.font = `${weight} ${reference}px Poppins`;
  const naturalSingleWidth = ctx.measureText(text).width || 1;
  const naturalSingleSize = (targetWidth / naturalSingleWidth) * reference;

  const words = text.split(" ").filter(Boolean);
  if (naturalSingleSize >= singleLineMin || words.length < 2) {
    return { lines: [text], size: Math.min(singleLineMax, Math.max(singleLineMin, naturalSingleSize)) };
  }

  // Try every word-boundary split and keep the one whose two lines are
  // closest in rendered width (measured at the same reference size) —
  // that's the split that lets both lines sit at the largest shared size.
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const w1 = ctx.measureText(words.slice(0, i).join(" ")).width;
    const w2 = ctx.measureText(words.slice(i).join(" ")).width;
    const diff = Math.abs(w1 - w2);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }

  const line1 = words.slice(0, bestSplit).join(" ");
  const line2 = words.slice(bestSplit).join(" ");
  const widestLine = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) || 1;
  const naturalTwoLineSize = (targetWidth / widestLine) * reference;
  return { lines: [line1, line2], size: Math.min(twoLineMax, Math.max(twoLineMin, naturalTwoLineSize)) };
}

// Shrinks (never grows) a font from `startSize` until `text` fits within
// `maxWidth` — used for the smaller support-artist line, where we want a
// fixed comfortable size for the common case and only shrink for a long
// run of names, rather than fitting every line to the exact same width
// the way the big headline does.
function shrinkFontToFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = 600,
  minSize = 12
): number {
  let size = startSize;
  ctx.font = `${weight} ${size}px Poppins`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px Poppins`;
  }
  return size;
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

  return encodeToJpeg(canvas);
}

// ---------------------------------------------------------------------
// "Big Stat" cover — headliner-led, with a support-artist line and a
// Date/Songs/Length stat row, in one of the app's own colour palettes.
// ---------------------------------------------------------------------

export type CoverPaletteId = "default" | "red" | "blue" | "mono" | "gold";
export type CoverAppearance = "light" | "dark";
export type CoverTexture = "rings" | "glow" | "dotGrid" | "flat";

export const COVER_PALETTES: { id: CoverPaletteId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "red", label: "Red" },
  { id: "blue", label: "Blue" },
  { id: "mono", label: "Mono" },
  { id: "gold", label: "Gold" },
];

export const COVER_TEXTURES: { id: CoverTexture; label: string }[] = [
  { id: "rings", label: "Rings" },
  { id: "glow", label: "Glow" },
  { id: "dotGrid", label: "Dot grid" },
  { id: "flat", label: "Flat" },
];

// Default/Red/Blue share the app's own neutral light/dark backgrounds —
// only the accent changes, one fixed hue per palette regardless of
// appearance, the same way it worked before this palette was widened.
// Mono and Gold get their own background pairs so they read as genuinely
// distinct, named-appropriately palettes rather than "default with a
// different dot": Mono is black/white throughout (bg, ink and accent all
// monochrome), Gold is a black background with a gold accent in dark
// mode — literally "black and gold" — and a warm ivory background with a
// deeper bronze accent in light mode, so the Light/Dark toggle still
// means something for it too.
function paletteColors(palette: CoverPaletteId, appearance: CoverAppearance) {
  const dark = appearance === "dark";

  if (palette === "mono") {
    return dark
      ? { accent: "#FFFFFF", bgFrom: "#000000", bgTo: "#0D0D0D", ink: "#FFFFFF" }
      : { accent: "#0A0A0A", bgFrom: "#FFFFFF", bgTo: "#F2F2F2", ink: "#0A0A0A" };
  }

  if (palette === "gold") {
    return dark
      ? { accent: "#D4AF37", bgFrom: "#000000", bgTo: "#14100A", ink: "#F8EFDD" }
      : { accent: "#8A6420", bgFrom: "#FBF6EA", bgTo: "#F1E6C8", ink: "#241C08" };
  }

  const accent = palette === "red" ? "#E5484D" : palette === "blue" ? "#3B82F6" : dark ? "#2EDCB0" : "#115067";
  return {
    accent,
    bgFrom: dark ? "#021A23" : "#F6F7F5",
    bgTo: dark ? "#0D3C4D" : "#EEF1F0",
    ink: dark ? "#F6F7F5" : "#0A1F26",
  };
}

export interface StatCoverOptions {
  headliner: string;
  supportNames: string[]; // selected support artists, in the order to show them
  dateLabel: string; // e.g. "14 Jun", or a fallback like "Date TBC"
  songCount: number;
  totalMinutesLabel: string; // e.g. "2h 48m", already formatted
  palette: CoverPaletteId;
  appearance: CoverAppearance;
  texture: CoverTexture;
}

// "Avatar, Taylor Swift + 4 more" — names two, folds the rest into a
// count, so the line stays one row regardless of how many are selected.
export function formatSupportLine(names: string[]): string {
  const clean = names.filter((n) => n.trim().length > 0);
  if (clean.length === 0) return "";
  if (clean.length <= 2) return clean.join(" & ");
  return `${clean[0]}, ${clean[1]} + ${clean.length - 2} more`;
}

let iconImagePromise: Promise<HTMLImageElement> | null = null;

// The brand mark (the three-slider icon) as a white-on-transparent PNG in
// /public, loaded once and tinted per-draw with a "source-in" composite —
// so it always renders as the real logo shape, in whatever accent the
// chosen palette calls for, without needing a separately-coloured asset
// per palette.
function loadIconImage(): Promise<HTMLImageElement> {
  if (!iconImagePromise) {
    iconImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't load the brand mark"));
      img.src = "/brand/eq-mark.png";
    });
  }
  return iconImagePromise;
}

function drawTintedIcon(ctx: CanvasRenderingContext2D, img: HTMLImageElement, color: string, x: number, y: number, height: number) {
  const width = (img.width / img.height) * height;
  const tint = document.createElement("canvas");
  tint.width = img.width;
  tint.height = img.height;
  const tctx = tint.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(img, 0, 0);
  tctx.globalCompositeOperation = "source-in";
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, img.width, img.height);
  ctx.drawImage(tint, x, y, width, height);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawTexture(ctx: CanvasRenderingContext2D, texture: CoverTexture, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE * 0.48;

  if (texture === "glow") {
    const glow = ctx.createRadialGradient(CANVAS_SIZE * 0.15, CANVAS_SIZE * 0.08, 0, CANVAS_SIZE * 0.15, CANVAS_SIZE * 0.08, CANVAS_SIZE * 0.55);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const glow2 = ctx.createRadialGradient(CANVAS_SIZE * 0.9, CANVAS_SIZE * 0.95, 0, CANVAS_SIZE * 0.9, CANVAS_SIZE * 0.95, CANVAS_SIZE * 0.5);
    glow2.addColorStop(0, `rgba(${r},${g},${b},0.14)`);
    glow2.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return;
  }

  if (texture === "dotGrid") {
    ctx.fillStyle = `rgba(${r},${g},${b},0.22)`;
    const spacing = 28;
    for (let gy = spacing / 2; gy < CANVAS_SIZE; gy += spacing) {
      for (let gx = spacing / 2; gx < CANVAS_SIZE; gx += spacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (texture === "rings") {
    // Drawn on an offscreen canvas so the radial fade (destination-in)
    // only clips the rings, not anything drawn on the main canvas
    // before it. Fully transparent through the middle ~55% — where the
    // headline and stat row sit — and fading in toward the edges, so
    // the rings frame the text instead of crossing it.
    const off = document.createElement("canvas");
    off.width = CANVAS_SIZE;
    off.height = CANVAS_SIZE;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
    octx.lineWidth = 1.5;
    [90, 150, 210, 270, 330, 390].forEach((radius) => {
      octx.beginPath();
      octx.arc(cx, cy, radius, 0, Math.PI * 2);
      octx.stroke();
    });
    octx.globalCompositeOperation = "destination-in";
    const mask = octx.createRadialGradient(cx, cy, 0, cx, cy, CANVAS_SIZE * 0.6);
    mask.addColorStop(0, "rgba(0,0,0,0)");
    mask.addColorStop(0.55, "rgba(0,0,0,0)");
    mask.addColorStop(1, "rgba(0,0,0,1)");
    octx.fillStyle = mask;
    octx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(off, 0, 0);
  }

  // "flat" draws nothing further.
}

export async function generateStatCover(options: StatCoverOptions): Promise<string> {
  await ensureFontLoaded();
  const iconImg = await loadIconImage().catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const { accent, bgFrom, bgTo, ink } = paletteColors(options.palette, options.appearance);

  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_SIZE * 0.25, CANVAS_SIZE);
  bgGrad.addColorStop(0, bgFrom);
  bgGrad.addColorStop(1, bgTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawTexture(ctx, options.texture, accent);

  // The top margin above the logo and the bottom margin below the stat
  // row/play-dot are kept equal (rather than the stat row sitting much
  // closer to the edge) so the whole card reads as evenly framed.
  const EDGE_MARGIN = 28;

  if (iconImg) drawTintedIcon(ctx, iconImg, accent, EDGE_MARGIN, EDGE_MARGIN, 40);

  // Headline (the headliner's name) — sized as large as the space allows
  // and centred at the vertical midpoint between the logo and the stat
  // row. A long name wraps onto two lines instead of shrinking to fit
  // one, so it stays visually big rather than looking like an
  // afterthought — layoutHeadliner decides which, and how big.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const headliner = options.headliner.toUpperCase();
  const headlinerLayout = layoutHeadliner(ctx, headliner, CANVAS_SIZE - 112);
  const headlinerSize = headlinerLayout.size;
  ctx.font = `900 ${headlinerSize}px Poppins`;
  ctx.fillStyle = ink;
  const blockCenterY = CANVAS_SIZE * 0.48;
  const headlineLineGap = headlinerSize * 0.98;
  // One line sits exactly at the block's centre; two lines straddle it
  // symmetrically so the wrap grows the block evenly, not downward only.
  const headlineLineYs =
    headlinerLayout.lines.length === 1
      ? [blockCenterY]
      : [blockCenterY - headlineLineGap / 2, blockCenterY + headlineLineGap / 2];
  headlinerLayout.lines.forEach((line, i) => ctx.fillText(line, CANVAS_SIZE / 2, headlineLineYs[i]));
  const headlineY = headlineLineYs[headlineLineYs.length - 1];

  // Support artists, with a small rule on either side
  const supportLine = formatSupportLine(options.supportNames);
  if (supportLine) {
    const supportMaxWidth = CANVAS_SIZE - 200;
    const supportSize = shrinkFontToFit(ctx, supportLine, supportMaxWidth, 17, 600, 12);
    ctx.font = `600 ${supportSize}px Poppins`;
    const textWidth = ctx.measureText(supportLine).width;
    // Gap below the last headline line scales a little with its size so
    // a big single-line name and a smaller two-line name both keep a
    // proportionate, not cramped or overly loose, gap to the line below.
    const supportY = headlineY + Math.max(36, headlinerSize * 0.42);
    ctx.fillStyle = accent;
    ctx.fillText(supportLine, CANVAS_SIZE / 2, supportY);

    const ruleGap = 10;
    const ruleWidth = 22;
    const ruleY = supportY - supportSize * 0.32;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    const leftX = CANVAS_SIZE / 2 - textWidth / 2 - ruleGap;
    const rightX = CANVAS_SIZE / 2 + textWidth / 2 + ruleGap;
    ctx.beginPath();
    ctx.moveTo(leftX - ruleWidth, ruleY);
    ctx.lineTo(leftX, ruleY);
    ctx.moveTo(rightX, ruleY);
    ctx.lineTo(rightX + ruleWidth, ruleY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Bottom stat row: Date / Songs / Length, plus a play-button dot.
  // The play-dot is the lowest-drawn element, so it's the one pinned to
  // EDGE_MARGIN above the canvas edge — the row's other elements are
  // then positioned relative to it, same as before.
  const dotR = 20;
  const dotY = CANVAS_SIZE - EDGE_MARGIN - dotR;
  const rowY = dotY + 6;
  const labelY = rowY - 20;
  const valueY = rowY + 4;
  const stats = [
    { label: "Date", value: options.dateLabel },
    { label: "Songs", value: String(options.songCount) },
    { label: "Length", value: options.totalMinutesLabel },
  ];
  ctx.textAlign = "left";
  let colX = 40;
  stats.forEach((stat) => {
    ctx.font = "700 11px Poppins";
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ink;
    ctx.fillText(stat.label.toUpperCase(), colX, labelY);
    ctx.globalAlpha = 1;
    ctx.font = "700 17px Poppins";
    ctx.fillStyle = ink;
    ctx.fillText(stat.value, colX, valueY);
    colX += Math.max(ctx.measureText(stat.value).width, 60) + 26;
  });

  // Play-button dot, bottom-right (dotR/dotY already set above, pinned
  // to EDGE_MARGIN from the bottom edge)
  const dotX = CANVAS_SIZE - 40 - dotR;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dotX - 6, dotY - 8);
  ctx.lineTo(dotX - 6, dotY + 8);
  ctx.lineTo(dotX + 9, dotY);
  ctx.closePath();
  ctx.fillStyle = bgFrom === "#021A23" ? "#021A23" : "#F6F7F5";
  // The triangle needs to read against the accent dot itself, not the
  // page background — the dark palette's own ink/bg pairing already
  // gives a reliable near-black/near-white choice for that regardless
  // of which of the two ever-so-slightly different darks bgFrom holds.
  ctx.fillStyle = options.appearance === "dark" ? "#021A23" : "#FFFFFF";
  ctx.fill();

  return encodeToJpeg(canvas);
}

// A largely flat-color image compresses well under JPEG regardless, but
// that's an expectation, not a guarantee — check rather than assume, the
// same caution the photo-upload path needed for a real reason.
function encodeToJpeg(canvas: HTMLCanvasElement): string {
  const MAX_BYTES = 240 * 1024;
  for (const quality of [0.9, 0.8, 0.65, 0.5]) {
    const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (base64.length * 0.75 <= MAX_BYTES) return base64;
  }
  return canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
}
