import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse, EquipmentRequest, EquipmentRequestListResult } from '../../types/index.js';
import { LarkBitableRepository } from '../../repositories/bitable/lark-bitable.repository.js';
import { EquipmentRequestsService } from './requests.service.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
} from './requests.schemas.js';
import type { RequestQuery } from './requests.schemas.js';

const service = (): EquipmentRequestsService => new EquipmentRequestsService(new LarkBitableRepository());

export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service().list(req.query as unknown as RequestQuery);
    const response: ApiResponse<EquipmentRequestListResult> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function getRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().get(req.params.id as string);
    const response: ApiResponse<EquipmentRequest> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().create(createRequestSchema.parse(req.body));
    const response: ApiResponse<EquipmentRequest> = { success: true, data: item };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

export async function updateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().update(req.params.id as string, updateRequestSchema.parse(req.body));
    const response: ApiResponse<EquipmentRequest> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().updateStatus(req.params.id as string, updateRequestStatusSchema.parse(req.body));
    const response: ApiResponse<EquipmentRequest> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function fulfillRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fulfillRequestSchema } = await import('./requests.schemas.js');
    const result = await service().fulfill(req.params.id as string, fulfillRequestSchema.parse(req.body));
    const response: ApiResponse<typeof result> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function deleteRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service().delete(req.params.id as string, (req.query.actor as string) || 'unknown');
  } catch (error) {
    next(error);
  }
}
