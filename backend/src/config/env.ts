import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Support both workspace-root starts and `npm run dev` from backend. Tests
// explicitly provide their own environment and must not read developer .env.
if (process.env['NODE_ENV'] !== 'test') {
  dotenv.config({ path: resolve(process.cwd(), '.env') });
  dotenv.config({ path: resolve(process.cwd(), '..', '.env'), override: false });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const larkProviderSchema = z.enum(['lark', 'feishu']).default('lark');

// ---------------------------------------------------------------------------
// Raw environment schema – all values come in as strings from process.env
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive()),

  // Lark / Feishu
  LARK_PROVIDER: larkProviderSchema,
  LARK_APP_ID: z.string().default(''),
  LARK_APP_SECRET: z.string().default(''),
  LARK_BITABLE_APP_TOKEN: z.string().default(''),

  // Optional table IDs
  LARK_TABLE_INVENTORY: z.string().default(''),
  LARK_TABLE_EMPLOYEES: z.string().default(''),
  LARK_TABLE_DEPARTMENTS: z.string().default(''),
  LARK_TABLE_ASSIGNMENTS: z.string().default(''),
  LARK_TABLE_REQUESTS: z.string().default(''),

  // Email Notification configuration (Optional SMTP, defaults to console log if unconfigured)
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z
    .string()
    .default('587')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int()),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('no-reply@inventory.internal'),
  ADMIN_EMAIL: z.string().default('admin@inventory.internal'),
});

// ---------------------------------------------------------------------------
// Parse and export
// ---------------------------------------------------------------------------

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error('❌ Invalid environment configuration:\n' + formatted);
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Returns true when all required Lark credentials are present */
export function isLarkConfigured(): boolean {
  return (
    env.LARK_APP_ID.length > 0 &&
    env.LARK_APP_SECRET.length > 0 &&
    env.LARK_BITABLE_APP_TOKEN.length > 0
  );
}

/** Returns the configured CORS origins as an array */
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

export type Env = z.infer<typeof envSchema>;
export type LarkProvider = z.infer<typeof larkProviderSchema>;
