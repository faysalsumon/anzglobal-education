import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  client = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
  });

  client.on("ready", () => console.log("[Redis] connected"));
  client.on("error", (err) => console.error("[Redis]", err.message));
  client.on("close", () => { client = null; });

  return client;
}
