import Redis from "ioredis";

import { RedisByteStore } from "@langchain/community/storage/ioredis";

export const client = new Redis(Bun.env.REDIS_URL as string);

export const store = new RedisByteStore({
  client,
});
