import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: rootEnvPath });
dotenv.config();

export const config = {
  port: Number(process.env.API_PORT || 8080),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379/0",
  pollMs: 2000,
};
