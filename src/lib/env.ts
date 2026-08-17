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