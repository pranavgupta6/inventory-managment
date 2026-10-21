import { Router } from 'express';
import { validate } from '../../middleware/index.js';
import {
  createRequestSchema,
  requestIdSchema,
  requestQuerySchema,
  updateRequestSchema,
  updateRequestStatusSchema,
} from './requests.schemas.js';
import {
  createRequest,
  fulfillRequest,
  getRequest,
  listRequests,
  updateRequest,
  updateRequestStatus,
  deleteRequest,
} from './requests.controller.js';
import { fulfillRequestSchema } from './requests.schemas.js';

const router = Router();
const asyncRoute = (handler: typeof listRequests) => (
  req: Parameters<typeof listRequests>[0],
  res: Parameters<typeof listRequests>[1],
  next: Parameters<typeof listRequests>[2],
): void => {
  void handler(req, res, next);
};

router.get('/', validate(requestQuerySchema, 'query'), asyncRoute(listRequests));
router.get('/:id', validate(requestIdSchema, 'params'), asyncRoute(getRequest));
router.post('/', validate(createRequestSchema), asyncRoute(createRequest));
router.patch('/:id', validate(requestIdSchema, 'params'), validate(updateRequestSchema), asyncRoute(updateRequest));
router.patch('/:id/status', validate(requestIdSchema, 'params'), validate(updateRequestStatusSchema), asyncRoute(updateRequestStatus));
router.post('/:id/fulfill', validate(requestIdSchema, 'params'), validate(fulfillRequestSchema), asyncRoute(fulfillRequest));
router.delete('/:id', validate(requestIdSchema, 'params'), asyncRoute(deleteRequest));

export { router as requestsRouter };
