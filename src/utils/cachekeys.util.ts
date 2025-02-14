// utils/cacheKeys.ts
export const CacheKeys = {
    recentUrls: (userId: string, topic: string, sortBy: string, page: number | string, limit: number | string) =>
      `recentUrls:${userId}:${topic || "all"}:${sortBy || "desc"}:${page}:${limit}`,
    userTopics: (userId: string) => `user:${userId}:topics`,
    overallAnalytics: (userId: string) => `overallAnalytics:${userId}`,
    topicAnalytics: (userId: string, topic: string) => `topicAnalytics:${userId}:${topic}`,
    urlAnalytics: (alias: string) => `analytics:${alias}`,
    shortUrl: (alias: string) => alias,
  };