import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 3001),
}));

export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs("redis", () => ({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const jwtConfig = registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET ?? "change-me-in-production",
  expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh-secret",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
}));

export const aiConfig = registerAs("ai", () => ({
  provider: process.env.AI_PROVIDER ?? "groq",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  },
}));

export const storageConfig = registerAs("storage", () => ({
  provider: process.env.STORAGE_PROVIDER ?? "local",
  localPath: process.env.STORAGE_LOCAL_PATH ?? "./uploads",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  },
}));
