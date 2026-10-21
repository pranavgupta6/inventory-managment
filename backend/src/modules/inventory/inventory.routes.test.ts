import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { BitableRecord, ListBitableRecordsOptions, ListBitableRecordsResult } from '../../types/index.js';

const state = vi.hoisted(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['LARK_APP_ID'] = 'test-app';
  process.env['LARK_APP_SECRET'] = 'test-secret';
  process.env['LARK_BITABLE_APP_TOKEN'] = 'test-base';
  process.env['LARK_TABLE_INVENTORY'] = 'tbl_inventory_test';
  return { records: [] as BitableRecord[] };
});

vi.mock('../../repositories/bitable/lark-bitable.repository.js', () => ({
  LarkBitableRepository: class {
    async listRecords(_tableId: string, _options?: ListBitableRecordsOptions): Promise<ListBitableRecordsResult> { return { records: state.records, hasMore: false }; }
    async findRecordByField(_tableId: string, fieldName: string, value: string): Promise<BitableRecord | null> { return state.records.find((record) => record.fields[fieldName] === value) ?? null; }
    async getRecord(_tableId: string, recordId: string): Promise<BitableRecord | null> { return state.records.find((record) => record.recordId === recordId) ?? null; }
    async createRecord(_tableId: string, fields: Record<string, unknown>): Promise<BitableRecord> { const record = { recordId: 'rec-created', fields }; state.records.push(record); return record; }
    async updateRecord(_tableId: string, recordId: string, fields: Record<string, unknown>): Promise<BitableRecord> { const record = state.records.find((candidate) => candidate.recordId === recordId); if (!record) throw new Error('not found'); record.fields = { ...record.fields, ...fields }; return record; }
    async deleteRecord(): Promise<void> {}
    async checkConnectivity(): Promise<boolean> { return true; }
  },
}));

import { createApp } from '../../app.js';

describe('device inventory routes', () => {
  it('supports create, list, detail, update, and deactivate using item_id', async () => {
    const app = createApp();
    const payload = { brand: 'Itel', deviceModel: 'Spark 30', sampleHwType: 'PRO', imei1: '123456789012345', imei2: '', serialNumber: '', vcId: '', color: '', storageRam: '', assignedDate: '2026-01-01', warehouseLocation: 'WH-A', inventoryHolder: 'Alex', remarks: '' };
    const created = await request(app).post('/api/inventory').send(payload);
    expect(created.status).toBe(201);
    const itemId = created.body.data.itemId as string;
    expect((await request(app).get('/api/inventory')).body.data.total).toBe(1);
    expect((await request(app).get(`/api/inventory/${itemId}`)).body.data.deviceModel).toBe('Spark 30');
    expect((await request(app).patch(`/api/inventory/${itemId}`).send({ color: 'Black' })).body.data.color).toBe('Black');
    expect((await request(app).delete(`/api/inventory/${itemId}`)).body.data.status).toBe('Inactive');
  });
});
