import { describe, expect, it, vi } from 'vitest';
import type { BitableRecord } from '../../types/index.js';

const list = vi.fn();
const create = vi.fn();
vi.hoisted(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['LARK_APP_ID'] = 'test-app';
  process.env['LARK_APP_SECRET'] = 'test-secret';
  process.env['LARK_BITABLE_APP_TOKEN'] = 'test-base';
});
vi.mock('../../config/index.js', () => ({
  getLarkClient: () => ({
    bitable: {
      appTableRecord: { list, create },
    },
  }),
}));

import { LarkBitableRepository } from './lark-bitable.repository.js';

describe('LarkBitableRepository', () => {
  it('paginates field lookup and returns the matching Bitable record', async () => {
    list
      .mockResolvedValueOnce({
        data: {
          items: [{ record_id: 'rec-1', fields: { item_id: 'item-1' } }],
          has_more: true,
          page_token: 'next',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ record_id: 'rec-2', fields: { item_id: 'item-2' } }],
          has_more: false,
        },
      });

    const result = await new LarkBitableRepository().findRecordByField(
      'tbl-inventory',
      'item_id',
      'item-2',
    );

    expect(result).toEqual< BitableRecord>({
      recordId: 'rec-2',
      fields: { item_id: 'item-2' },
    });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('wraps authorization errors without exposing credentials', async () => {
    list.mockRejectedValueOnce({ code: 99991400, message: 'permission denied' });

    await expect(
      new LarkBitableRepository().findRecordByField('tbl-inventory', 'item_id', 'item-1'),
    ).rejects.toMatchObject({
      code: 'LARK_99991400',
      message: expect.not.stringContaining('test-secret'),
    });

  });

  it('reports an Lark response error when create returns no record because the table request failed', async () => {
    create.mockResolvedValueOnce({
      code: 1254040,
      msg: 'Field not found: Device Model',
      data: undefined,
    });

    await expect(
      new LarkBitableRepository().createRecord('tbl-inventory', { 'Device Model': 'Spark 30' }),
    ).rejects.toMatchObject({
      code: 'LARK_1254040',
      message: expect.stringContaining('Field not found: Device Model'),
    });
  });

  it('reports a distinct SDK response-shape error when create succeeds without a record', async () => {
    create.mockResolvedValueOnce({ code: 0, msg: 'success', data: {} });

    await expect(
      new LarkBitableRepository().createRecord('tbl-inventory', { Brand: 'Itel' }),
    ).rejects.toMatchObject({
      code: 'CREATE_FAILED',
      message: expect.stringContaining('returned no record data'),
    });
  });
});
