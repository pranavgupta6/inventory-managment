import { Router } from 'express';
import { AuditController } from './audit.controller.js';

const auditRouter = Router();
const controller = new AuditController();

auditRouter.get('/logs', (req, res, next) => {
  controller.getLogs(req, res).catch(next);
});

auditRouter.get('/duplicates', (req, res, next) => {
  controller.getDuplicateAlerts(req, res).catch(next);
});

auditRouter.get('/anomalies', (req, res, next) => {
  controller.getAnomalies(req, res).catch(next);
});

auditRouter.get('/reports', (req, res, next) => {
  controller.getReport(req, res).catch(next);
});

auditRouter.post('/log', (req, res, next) => {
  controller.createLog(req, res).catch(next);
});

export { auditRouter };
