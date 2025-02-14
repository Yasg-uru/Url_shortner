import Redis from "ioredis";

export type RedisClientOptions = {
  host: string;
  port: number;
  password?: string;
};

// Define Redis connection options
const redisOptions: RedisClientOptions = {
  host: 'redis-18454.c240.us-east-1-3.ec2.redns.redis-cloud.com', // Host without protocol
  port: 18454, // Port from the connection string
  password: 'qrwolXFcCbEriZeaIBGGxmWLkiWLhS7o', // Password from the connection string
};

// Create Redis client
const redisClient = new Redis(redisOptions);

// Event listeners
redisClient.on("connect", () => {
  console.log("Connected to Redis successfully");
});

redisClient.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
});

export default redisClient;