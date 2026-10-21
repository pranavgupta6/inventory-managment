import { getLarkClient, isLarkConfigured } from '../../config/index.js';
import { env } from '../../config/env.js';
import { LarkBitableRepository } from '../../repositories/bitable/index.js';
import type { IntegrationStatus } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Lark Connectivity Check Service
// ---------------------------------------------------------------------------
// Responsible for determining and reporting the integration status.
// Never fabricates "connected" state — only reports what has been verified.
// ---------------------------------------------------------------------------

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const provider = env.LARK_PROVIDER;

  const tables: Record<string, boolean> = {
    inventory: env.LARK_TABLE_INVENTORY.length > 0,
    employees: env.LARK_TABLE_EMPLOYEES.length > 0,
    departments: env.LARK_TABLE_DEPARTMENTS.length > 0,
    assignments: env.LARK_TABLE_ASSIGNMENTS.length > 0,
    requests: env.LARK_TABLE_REQUESTS.length > 0,
  };

  const baseConfigured = env.LARK_BITABLE_APP_TOKEN.length > 0;

  // Level 1 — nothing configured
  if (!isLarkConfigured()) {
    return {
      provider,
      level: 'not_configured',
      message:
        'Lark credentials are not configured. Set LARK_APP_ID, LARK_APP_SECRET, and LARK_BITABLE_APP_TOKEN in your .env file.',
      baseConfigured,
      tables,
    };
  }

  // Level 2 — credentials present; attempt live connectivity check
  try {
    getLarkClient(); // Throws if client cannot be created
    const repo = new LarkBitableRepository();
    await repo.checkConnectivity();

    return {
      provider,
      level: 'connected',
      message: 'Successfully connected to Lark Bitable.',
      baseConfigured,
      tables,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during connectivity check.';
    const errorCode =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : 'UNKNOWN';

    // Credentials are set but live check failed
    return {
      provider,
      level: 'error',
      message: `Lark credentials are configured but connectivity check failed: ${errorMessage}`,
      errorCode,
      baseConfigured,
      tables,
    };
  }
}
