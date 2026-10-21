import type { Request, Response, NextFunction } from 'express';
import { getIntegrationStatus } from '../../services/lark/connectivity.service.js';
import type { ApiResponse, IntegrationStatus } from '../../types/index.js';
import { env } from '../../config/env.js';

// ---------------------------------------------------------------------------
// Health Controller
// ---------------------------------------------------------------------------

/** GET /api/health — lightweight liveness probe */
export function getHealth(_req: Request, res: Response): void {
  const response: ApiResponse<{ status: string; timestamp: string; version: string }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
  };
  res.status(200).json(response);
}

/** GET /api/integration-status — reports Lark configuration and connectivity */
export async function getIntegrationStatusHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await getIntegrationStatus();

    const httpStatus =
      status.level === 'connected'
        ? 200
        : status.level === 'configured'
          ? 200
          : status.level === 'not_configured'
            ? 200 // Not an error — just informational
            : 503; // 'error' level

    const response: ApiResponse<IntegrationStatus> = {
      success: status.level !== 'error',
      data: status,
    };

    res.status(httpStatus).json(response);
  } catch (err) {
    next(err);
  }
}

/** GET /api/config-info — safe configuration summary (no credentials) */
export function getConfigInfo(_req: Request, res: Response): void {
  const response: ApiResponse<{
    provider: string;
    environment: string;
    appIdConfigured: boolean;
    baseTokenConfigured: boolean;
  }> = {
    success: true,
    data: {
      provider: env.LARK_PROVIDER,
      environment: env.NODE_ENV,
      appIdConfigured: env.LARK_APP_ID.length > 0,
      baseTokenConfigured: env.LARK_BITABLE_APP_TOKEN.length > 0,
    },
  };
  res.status(200).json(response);
}
