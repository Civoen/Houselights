// Fires a short vibration on devices/browsers that support the Vibration API
// (mainly Android Chrome — iOS Safari doesn't implement it, and this fails
// silently there). Used sparingly, on meaningful state changes rather than
// every tap, so it reads as confirmation rather than noise.
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* not all browsers allow this outside a direct user gesture — ignore */
  }
}

export const HAPTIC = {
  tap: 8,
  add: 12,
  remove: [8, 30, 8] as number[],
  reorder: 10,
  success: [15, 60, 25] as number[],
};
