import { Request, Response, NextFunction } from "express";
import redisClient from "../configurations/redis.config";
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }
  const key = `rate-limit:${userId}`;
  const limit = 10; // Max 10 URLs per hour
  const expiry = 60 * 60; // 1 hour

  try {
    const requests = await redisClient.incr(key);
    if (requests === 1) await redisClient.expire(key, expiry);

    if (requests > limit) {
      res
        .status(429)
        .json({ message: "Rate limit exceeded. Try again later." });
      return;
    }
    next();
  } catch (error) {
    console.error("Redis error:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
}
