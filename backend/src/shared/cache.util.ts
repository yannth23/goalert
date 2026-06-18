import { RedisService } from '../redis/redis.service';

/**
 * Executes a cached fetch: returns cached value if available,
 * otherwise calls the fetcher, caches the result, and returns it.
 */
export async function withCache<T>(
  redis: RedisService,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.getJson<T>(key);
    if (cached !== null) return cached;
  } catch {
    // cache miss — proceed to fetch
  }

  const result = await fetcher();

  try {
    await redis.setJson(key, result, ttlSeconds);
  } catch {
    // non-critical — cache write failure is acceptable
  }

  return result;
}
