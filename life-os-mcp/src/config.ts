import { z } from 'zod'

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TIMEZONE: z.string().default('UTC'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(env: unknown): Env {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }
  return result.data
}
