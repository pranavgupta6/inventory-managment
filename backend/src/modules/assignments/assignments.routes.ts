import { Router } from 'express';
import { validate } from '../../middleware/index.js';
import {
  assignmentIdSchema,
  assignmentQuerySchema,
  createAssignmentSchema,
  returnAssignmentSchema,
  updateAssignmentSchema,
} from './assignments.schemas.js';
import {
  createAssignment,
  deleteAssignment,
  exportAssignments,
  getAssignment,
  listAssignments,
  returnAssignment,
  updateAssignment,
} from './assignments.controller.js';

const router = Router();
const asyncRoute =
  (handler: typeof listAssignments) =>
  (
    req: Parameters<typeof listAssignments>[0],
    res: Parameters<typeof listAssignments>[1],
    next: Parameters<typeof listAssignments>[2],
  ): void => {
    void handler(req, res, next);
  };

router.get('/', validate(assignmentQuerySchema, 'query'), asyncRoute(listAssignments));
router.get('/export', asyncRoute(exportAssignments));
router.get('/:id', validate(assignmentIdSchema, 'params'), asyncRoute(getAssignment));
router.post('/', validate(createAssignmentSchema), asyncRoute(createAssignment));
router.patch(
  '/:id',
  validate(assignmentIdSchema, 'params'),
  validate(updateAssignmentSchema),
  asyncRoute(updateAssignment),
);
router.post(
  '/:id/return',
  validate(assignmentIdSchema, 'params'),
  validate(returnAssignmentSchema),
  asyncRoute(returnAssignment),
);
router.delete('/:id', validate(assignmentIdSchema, 'params'), asyncRoute(deleteAssignment));

export { router as assignmentsRouter };
