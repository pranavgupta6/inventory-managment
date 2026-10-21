import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BitableRecord, ListBitableRecordsOptions, ListBitableRecordsResult } from '../../types/index.js';
import type { IBitableRepository } from '../../repositories/bitable/bitable.interface.js';
import { InventoryService } from './inventory.service.js';
import { BRANDS, SAMPLE_HW_TYPES, createInventorySchema, inventoryQuerySchema } from './inventory.schemas.js';

vi.hoisted(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['LARK_TABLE_INVENTORY'] = 'tbl_inventory_test';
});

class FakeRepository implements IBitableRepository {
  records: BitableRecord[] = [];
  listCalls: ListBitableRecordsOptions[] = [];
  updateRecord = vi.fn(async (_tableId: string, recordId: string, fields: Record<string, unknown>) => {
    const record = this.records.find((candidate) => candidate.recordId === recordId);
    if (record === undefined) throw new Error('record not found');
    record.fields = { ...record.fields, ...fields };
    return record;
  });
  async listRecords(_tableId: string, options: ListBitableRecordsOptions = {}): Promise<ListBitableRecordsResult> {
    this.listCalls.push(options);
    return { records: options.pageToken === 'page-2' ? this.records.slice(2) : this.records.slice(0, 2), hasMore: options.pageToken !== 'page-2', ...(options.pageToken === undefined && { pageToken: 'page-2' }) };
  }
  async findRecordByField(_tableId: string, fieldName: string, value: string): Promise<BitableRecord | null> {
    return this.records.find((record) => record.fields[fieldName] === value) ?? null;
  }
  async getRecord(_tableId: string, recordId: string): Promise<BitableRecord | null> { return this.records.find((record) => record.recordId === recordId) ?? null; }
  async createRecord(_tableId: string, fields: Record<string, unknown>): Promise<BitableRecord> {
    const record = { recordId: 'rec-created', fields };
    this.records.push(record);
    return record;
  }
  async deleteRecord(): Promise<void> {}
  async checkConnectivity(): Promise<boolean> { return true; }
}

function device(recordId: string, itemId: string, imei1: string, brand = 'Itel'): BitableRecord {
  return { recordId, fields: {
    item_id: itemId, Brand: brand, 'Device Model': 'Spark 30', 'Sample/HW': 'PRO',
    IMEI1: imei1, IMEI2: '', 'Serial Number': 'SN-1', 'VC ID': 'VC-1', Color: 'Black',
    'Storage / RAM': '8GB/128GB', 'Assigned Date': 1798761600000, 'Warehouse/Location': 'WH-A',
    'Inventory Holder': 'Alex', Remarks: '', Status: 'Active',
  } };
}

const validInput = {
  brand: 'Itel', deviceModel: 'Spark 30', sampleHwType: 'PRO', imei1: '123456789012345',
  imei2: '', serialNumber: '', vcId: '', color: '', storageRam: '', assignedDate: '2026-01-01',
  warehouseLocation: 'WH-A', inventoryHolder: 'Alex', remarks: '', status: 'Active',
} as const;

describe('device inventory schemas', () => {
  it('restricts dropdowns and validates IMEI/date/required fields', () => {
    expect(BRANDS).toEqual(['Itel', 'Tecno', 'Infinix', 'Oraimo', 'Villaon', 'Other']);
    expect(SAMPLE_HW_TYPES).toEqual(['PRO', 'PRO-1', 'PR1', 'PR1-1', 'PR2', 'PIR', 'MPR']);
    expect(() => createInventorySchema.parse({ ...validInput, brand: 'Apple' })).toThrow();
    expect(() => createInventorySchema.parse({ ...validInput, imei1: '123' })).toThrow();
    expect(() => createInventorySchema.parse({ ...validInput, imei2: '123' })).toThrow();
    expect(() => createInventorySchema.parse({ ...validInput, assignedDate: 'not-a-date' })).toThrow();
    expect(() => createInventorySchema.parse({ ...validInput, inventoryHolder: ' ' })).toThrow();
    expect(inventoryQuerySchema.parse({}).page).toBe(1);
  });
});

describe('InventoryService', () => {
  let repository: FakeRepository;
  let service: InventoryService;
  beforeEach(() => {
    repository = new FakeRepository();
    repository.records = [device('rec-1', 'item-1', '123456789012345'), device('rec-2', 'item-2', '223456789012345', 'Tecno'), device('rec-3', 'item-3', '323456789012345')];
    service = new InventoryService(repository);
  });

  it('maps, searches, paginates, and calculates device metrics', async () => {
    const result = await service.list({ page: 1, pageSize: 2, search: 'WH-A', brand: undefined, status: undefined });
    expect(result.records).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.totalByBrand.Itel).toBe(2);
    expect(result.activeCount).toBe(3);
  });

  it('treats empty optional query filters as absent', () => {
    expect(inventoryQuerySchema.parse({ brand: '', status: '', search: '' })).toMatchObject({
      brand: undefined,
      status: undefined,
      search: '',
    });
  });

  it('resolves item_id to the internal record ID for detail/update/deactivate', async () => {
    expect((await service.get('item-1')).imei1).toBe('123456789012345');
    expect((await service.get('item-1')).sampleHwType).toBe('PRO');
    expect((await service.get('item-1')).warehouseLocation).toBe('WH-A');
    expect((await service.get('item-1')).assignedDate).toBe('2027-01-01');
    await service.update('item-1', { color: 'Blue' });
    await service.deactivate('item-1');
    expect(repository.updateRecord).toHaveBeenNthCalledWith(1, 'tbl_inventory_test', 'rec-1', expect.objectContaining({ Color: 'Blue' }));
    expect(repository.updateRecord).toHaveBeenNthCalledWith(2, 'tbl_inventory_test', 'rec-1', expect.objectContaining({ Status: 'Inactive' }));
  });

  it('maps device fields and dates to the Lark column names when creating', async () => {
    await service.create({ ...validInput, imei1: '423456789012345' });
    expect(repository.records[3]?.fields).toMatchObject({
      Brand: 'Itel',
      'Device Model': 'Spark 30',
      'Sample/HW': 'PRO',
      'Warehouse/Location': 'WH-A',
      'Assigned Date': 1767225600000,
      Status: 'Active',
    });
    expect(repository.records[3]?.fields['Sample / HW Type']).toBeUndefined();
    expect(repository.records[3]?.fields['Warehouse / Location']).toBeUndefined();
  });

  it('checks duplicate IMEIs across every page', async () => {
    await expect(service.create({ ...validInput, imei1: '323456789012345' })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(repository.listCalls).toHaveLength(2);
  });
});
