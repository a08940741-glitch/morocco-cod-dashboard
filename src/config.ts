import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOCAL_DATA_FILE: z.string().min(1).default("data/local-store.json"),
  AWS_REGION: z.string().trim().min(1).optional(),
  REGISTRATION_INVITE_CODE: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).refine((value) => !value.startsWith("replace-"), {
    message: "Set a real random session secret.",
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
