import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse, InventoryItem, InventoryListResult } from '../../types/index.js';
import { LarkBitableRepository } from '../../repositories/bitable/lark-bitable.repository.js';
import { InventoryService, type BulkUploadResult } from './inventory.service.js';
import {
  createInventorySchema,
  updateInventorySchema,
  bulkUploadSchema,
  type InventoryQuery,
} from './inventory.schemas.js';

const service = (): InventoryService => new InventoryService(new LarkBitableRepository());

export async function listInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service().list(req.query as unknown as InventoryQuery);
    const response: ApiResponse<InventoryListResult> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().get(req.params.id as string);
    const response: ApiResponse<InventoryItem> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function createInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().create(createInventorySchema.parse(req.body));
    const response: ApiResponse<InventoryItem> = { success: true, data: item };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

export async function bulkUploadInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = bulkUploadSchema.parse(req.body);
    const result = await service().bulkUpload(input);
    const response: ApiResponse<BulkUploadResult> = { success: true, data: result };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().update(req.params.id as string, updateInventorySchema.parse(req.body));
    const response: ApiResponse<InventoryItem> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function deactivateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service().deactivate(req.params.id as string);
    const response: ApiResponse<InventoryItem> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function deleteInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service().delete(req.params.id as string, (req.query.actor as string) || 'unknown');
  } catch (error) {
    next(error);
  }
}
