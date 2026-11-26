import { z } from "zod";

export const UserRoleSchema = z.enum(["CUSTOMER", "ADMIN", "GATEKEEPER", "BARTENDER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  role: UserRoleSchema,
  isActive: z.boolean().default(true),
});
export type User = z.infer<typeof UserSchema>;

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const AuthResponseSchema = z.object({
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  staff: z.object({
    id: z.string(),
    username: z.string(),
    role: z.string(),
  }).optional(),
  user: UserSchema.optional(),
  token: z.string().optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
