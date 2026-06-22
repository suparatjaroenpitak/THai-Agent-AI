import Redis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function publishWorkerEvent(channel: string, payload: unknown) {
  if (redis.status === "end") return 0;
  if (redis.status === "wait") await redis.connect();
  return redis.publish(channel, JSON.stringify(payload));
}
