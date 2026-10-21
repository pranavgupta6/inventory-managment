import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse, Assignment, AssignmentListResult } from '../../types/index.js';
import { LarkBitableRepository } from '../../repositories/bitable/lark-bitable.repository.js';
import { AssignmentsService } from './assignments.service.js';
import {
  createAssignmentSchema,
  returnAssignmentSchema,
  updateAssignmentSchema,
  type AssignmentQuery,
} from './assignments.schemas.js';

const service = (): AssignmentsService => new AssignmentsService(new LarkBitableRepository());

export async function listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service().list(req.query as unknown as AssignmentQuery);
    const response: ApiResponse<AssignmentListResult> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function getAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().get(req.params.id as string);
    const response: ApiResponse<Assignment> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().create(createAssignmentSchema.parse(req.body));
    const response: ApiResponse<Assignment> = { success: true, data: item };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

export async function updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().update(req.params.id as string, updateAssignmentSchema.parse(req.body));
    const response: ApiResponse<Assignment> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function returnAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().returnAssignment(req.params.id as string, returnAssignmentSchema.parse(req.body));
    const response: ApiResponse<Assignment> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function exportAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filename, csv } = await service().exportCsv();
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      return;
    }
    res.json({ success: true, data: { filename, csv } });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service().delete(req.params.id as string, (req.query.actor as string) || 'unknown');
  } catch (error) {
    next(error);
  }
}
