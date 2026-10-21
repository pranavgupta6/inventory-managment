import { Router } from 'express';
import { validate } from '../../middleware/index.js';
import {
  createInventorySchema,
  inventoryIdSchema,
  inventoryQuerySchema,
  updateInventorySchema,
  bulkUploadSchema,
} from './inventory.schemas.js';
import {
  createInventory,
  bulkUploadInventory,
  deactivateInventory,
  deleteInventory,
  getInventory,
  listInventory,
  updateInventory,
} from './inventory.controller.js';

const router = Router();
const asyncRoute =
  (handler: typeof listInventory) =>
  (
    req: Parameters<typeof listInventory>[0],
    res: Parameters<typeof listInventory>[1],
    next: Parameters<typeof listInventory>[2],
  ): void => {
    void handler(req, res, next);
  };

router.get('/', validate(inventoryQuerySchema, 'query'), asyncRoute(listInventory));
router.post('/bulk-upload', validate(bulkUploadSchema), asyncRoute(bulkUploadInventory));
router.get('/:id', validate(inventoryIdSchema, 'params'), asyncRoute(getInventory));
router.post('/', validate(createInventorySchema), asyncRoute(createInventory));
router.patch(
  '/:id',
  validate(inventoryIdSchema, 'params'),
  validate(updateInventorySchema),
  asyncRoute(updateInventory),
);
router.post('/:id/deactivate', validate(inventoryIdSchema, 'params'), asyncRoute(deactivateInventory));
router.delete('/:id', validate(inventoryIdSchema, 'params'), asyncRoute(deleteInventory));

export { router as inventoryRouter };
