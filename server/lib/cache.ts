import { getRedis } from "./redis";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(key: string): Promise<T | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      // fall through to in-process store
    }
  }

  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data;
}

export async function setCached<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(value));
      return;
    } catch {
      // fall through to in-process store
    }
  }

  store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
}

export async function invalidateCache(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = next;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== "0");
      return;
    } catch {
      // fall through to in-process store
    }
  }

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
