import { prisma } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

const CACHE_KEY = "platform:settings";
const TTL_SEC = 300;

type SettingsMap = Record<string, string>;

export async function getAllSettings(): Promise<SettingsMap> {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return JSON.parse(cached) as SettingsMap;

  const rows = await prisma.platformSettings.findMany();
  const map: SettingsMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  await cacheSet(CACHE_KEY, JSON.stringify(map), TTL_SEC);
  return map;
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  return (await getAllSettings())[key] ?? fallback;
}

export async function getNumericSetting(key: string, fallback: number): Promise<number> {
  const v = await getSetting(key, String(fallback));
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getBoolSetting(key: string, fallback: boolean): Promise<boolean> {
  const v = await getSetting(key, fallback ? "true" : "false");
  return v === "true" || v === "1";
}

export async function invalidateSettingsCache(): Promise<void> {
  await cacheDel(CACHE_KEY);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.platformSettings.upsert({
    where:  { key },
    create: { key, value },
    update: { value },
  });
  await invalidateSettingsCache();
}
