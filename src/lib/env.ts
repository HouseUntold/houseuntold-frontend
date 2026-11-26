import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:8080/api"),
  VITE_WS_URL: z.string().default("ws://localhost:8080/api/admin/ws"),
  VITE_APP_NAME: z.string().default("VenueOS"),
  VITE_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  VITE_WS_URL: import.meta.env.VITE_WS_URL || "ws://localhost:8080/api/admin/ws",
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || "VenueOS",
  VITE_ENV: import.meta.env.VITE_ENV || "development",
});
