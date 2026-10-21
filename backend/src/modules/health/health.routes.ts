import { Router } from 'express';
import { getHealth, getIntegrationStatusHandler, getConfigInfo } from './health.controller.js';

const router = Router();

/** GET /api/health — liveness probe */
router.get('/health', getHealth);

/** GET /api/integration-status — Lark configuration and connectivity */
router.get('/integration-status', (req, res, next) => {
  void getIntegrationStatusHandler(req, res, next);
});

/** GET /api/config-info — safe environment summary */
router.get('/config-info', getConfigInfo);

export { router as healthRouter };
