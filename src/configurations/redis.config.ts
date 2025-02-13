import Redis from "ioredis";

export type RedisClientOptions = {
  host: string;
  port: number;
  password?: string;
};

const redisClient = new Redis({
  host: "127.0.0.1", // Localhost for trial
  port: 6379, // Default Redis port
});

redisClient.on("connect", () => {
  console.log("Connected to Redis successfully");
});

redisClient.on("error", (err: Error) => {
    console.error("Redis connection error:", err.message);
});

export default redisClient;
