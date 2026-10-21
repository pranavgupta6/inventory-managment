import * as lark from '@larksuiteoapi/node-sdk';
import { env, isLarkConfigured, type LarkProvider } from './env.js';

// ---------------------------------------------------------------------------
// Domain mapping
// ---------------------------------------------------------------------------

const DOMAIN_MAP: Record<LarkProvider, lark.Domain> = {
  lark: lark.Domain.Lark,
  feishu: lark.Domain.Feishu,
};

// ---------------------------------------------------------------------------
// Singleton client — only created when credentials are present
// ---------------------------------------------------------------------------

let _client: lark.Client | null = null;

/**
 * Returns the initialized Lark SDK client.
 * Throws if credentials are not configured — callers must check
 * `isLarkConfigured()` before calling this.
 */
export function getLarkClient(): lark.Client {
  if (_client !== null) {
    return _client;
  }

  if (!isLarkConfigured()) {
    throw new Error(
      'Lark credentials are not configured. Set LARK_APP_ID, LARK_APP_SECRET, and LARK_BITABLE_APP_TOKEN in your .env file.',
    );
  }

  _client = new lark.Client({
    appId: env.LARK_APP_ID,
    appSecret: env.LARK_APP_SECRET,
    // SelfBuild is correct for a custom enterprise app (not an ISV marketplace app)
    appType: lark.AppType.SelfBuild,
    domain: DOMAIN_MAP[env.LARK_PROVIDER],
  });

  return _client;
}

/**
 * Resets the cached client. Useful in tests.
 */
export function resetLarkClient(): void {
  _client = null;
}
