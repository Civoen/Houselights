import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

export function getEnv(key: string): string | undefined {
  const ctx = getOptionalRequestContext();
  const fromCloudflare = ctx?.env ? (ctx.env as Record<string, string | undefined>)[key] : undefined;
  return fromCloudflare ?? process.env[key];
}
