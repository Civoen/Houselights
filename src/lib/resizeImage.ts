"use client";
import { copy } from "./copy";

// Resizes an image file down to a max dimension and re-encodes as JPEG,
// keeping the upload small and fast rather than sending a multi-megabyte
// phone-camera photo straight to the vision API.
export function resizeImageToBase64(file: File, maxDimension = 1400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(copy.common.canvasNotSupportedError));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(copy.common.imageReadError));
    };
    img.src = url;
  });
}

// Spotify's playlist cover endpoint has a hard 256KB cap on the encoded
// JPEG. A 1400px/85%-quality encode (the defaults above, tuned for the
// poster vision API which has no such limit) can easily exceed that for a
// real photo — so rather than picking one fixed size/quality and hoping it
// fits, this tries progressively smaller/lower-quality encodes until the
// result is actually under the limit.
export function resizeImageForSpotifyCover(file: File): Promise<string> {
  const MAX_BYTES = 240 * 1024; // small margin under Spotify's 256KB cap
  const attempts: [number, number][] = [
    [1000, 0.8],
    [800, 0.75],
    [640, 0.7],
    [500, 0.6],
    [400, 0.5],
  ];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(copy.common.canvasNotSupportedError));
        return;
      }

      for (const [dimension, quality] of attempts) {
        let { width, height } = img;
        if (width > dimension || height > dimension) {
          const scale = dimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
        // base64 runs ~4/3 the size of the underlying binary
        if (base64.length * 0.75 <= MAX_BYTES) {
          resolve(base64);
          return;
        }
      }
      reject(new Error(copy.common.imageShrinkError));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(copy.common.imageReadError));
    };
    img.src = url;
  });
}
