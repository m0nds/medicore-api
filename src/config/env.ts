import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("8080"),
  DATABASE_URL: z.string({ error: "DATABASE_URL is required" }),
  JWT_ACCESS_SECRET: z.string({ error: "JWT_ACCESS_SECRET is required" }),
  JWT_REFRESH_SECRET: z.string({ error: "JWT_REFRESH_SECRET is required" }),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379"),
  RESEND_API_KEY: z.string({ error: "RESEND_API_KEY is required" }),
  ENCRYPTION_KEY: z.string({ error: "ENCRYPTION_KEY is required" }),
  BASE_URL: z.string().default("http://localhost:8080"),
  LOG_LEVEL: z.string().default("info"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data