import type { Request, Response } from 'express';
import { auditService } from './audit.service.js';
import { auditQuerySchema, reportQuerySchema } from './audit.schemas.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { LarkBitableRepository } from '../../repositories/bitable/lark-bitable.repository.js';

function getRepo() {
  return new LarkBitableRepository();
}

export class AuditController {
  async getLogs(req: Request, res: Response): Promise<void> {
    const query = auditQuerySchema.parse(req.query);
    const result = auditService.list(query);
    res.json({ success: true, data: result });
  }

  async getDuplicateAlerts(req: Request, res: Response): Promise<void> {
    const alerts = auditService.getDuplicateAlerts();
    res.json({ success: true, data: alerts });
  }

  async getAnomalies(req: Request, res: Response): Promise<void> {
    const repo = getRepo();
    const inventoryService = new InventoryService(repo);
    const assignmentsService = new AssignmentsService(repo);

    const [invResult, assignResult] = await Promise.all([
      inventoryService.list({ page: 1, pageSize: 1000, search: '' }),
      assignmentsService.list({ page: 1, pageSize: 1000, search: '' }),
    ]);

    const anomalies = auditService.getAnomalies(invResult.records, assignResult.records);
    res.json({ success: true, data: anomalies });
  }

  async getReport(req: Request, res: Response): Promise<void> {
    const query = reportQuerySchema.parse(req.query);
    const repo = getRepo();
    const inventoryService = new InventoryService(repo);
    const assignmentsService = new AssignmentsService(repo);

    const [invResult, assignResult] = await Promise.all([
      inventoryService.list({ page: 1, pageSize: 1000, search: '' }),
      assignmentsService.list({ page: 1, pageSize: 1000, search: '' }),
    ]);

    const report = auditService.generateReport(query, invResult.records, assignResult.records);

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.send(report.csv);
      return;
    }

    res.json({
      success: true,
      data: {
        filename: report.filename,
        reportData: report.data,
        csv: report.csv,
      },
    });
  }

  async createLog(req: Request, res: Response): Promise<void> {
    const { actorId, actorName, actorRole, action, entityType, entityId, details, status } = req.body;
    const entry = auditService.log({
      actorId: actorId || 'system',
      actorName: actorName || 'System',
      actorRole: actorRole || 'System',
      action: action || 'ANOMALY_DETECTED',
      entityType: entityType || 'Security',
      entityId: entityId || 'unknown',
      details: details || {},
      status: status || 'SUCCESS',
    });
    res.status(201).json({ success: true, data: entry });
  }
}
