import redisClient from "../configurations/redis.config";

export async function invalidateCache(keys: string[]) {
    try {
      for (const key of keys) {
        if (key.includes("*")) {
          // Handle wildcard patterns
          const matchingKeys = await redisClient.keys(key);
          if (matchingKeys.length > 0) {
            await redisClient.del(matchingKeys);
          }
        } else {
          // Delete exact key
          await redisClient.del(key);
        }
      }
    } catch (error) {
      console.error("Cache invalidation failed:", error);
    }
  }