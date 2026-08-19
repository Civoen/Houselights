import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();

    const fromCloudflare = env
      ? (env as Record<string, string | undefined>)[key]
      : undefined;

    return fromCloudflare ?? process.env[key];
  } catch {
    return process.env[key];
  }
}

// KV bindings aren't plain strings like the rest of env, so this is
// deliberately separate from getEnv rather than overloading it. No
// process.env fallback here — a KV namespace only exists as a real
// Cloudflare binding, there's nothing meaningful to fall back to locally.
// Typed loosely (not as the real KVNamespace type) since this project
// doesn't currently pull in @cloudflare/workers-types.
export function getKV(binding: string): any | undefined {
  try {
    const { env } = getCloudflareContext();
    return env ? (env as Record<string, any>)[binding] : undefined;
  } catch {
    return undefined;
  }
}