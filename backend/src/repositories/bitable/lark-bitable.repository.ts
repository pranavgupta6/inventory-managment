import * as lark from '@larksuiteoapi/node-sdk';
import { getLarkClient } from '../../config/index.js';
import { env } from '../../config/env.js';
import { LarkIntegrationError } from '../../middleware/index.js';
import type {
  BitableRecord,
  BitableFieldValue,
  ListBitableRecordsOptions,
  ListBitableRecordsResult,
} from '../../types/index.js';
import type { IBitableRepository } from './bitable.interface.js';

// ---------------------------------------------------------------------------
// SDK field union type — mirrors the SDK's inline create/update field type
// ---------------------------------------------------------------------------

type LarkFieldValue =
  | string
  | number
  | boolean
  | { text?: string; link?: string }
  | {
      location?: string;
      pname?: string;
      cityname?: string;
      adname?: string;
      address?: string;
      name?: string;
      full_address?: string;
    }
  | Array<{ id?: string; name?: string; avatar_url?: string }>
  | Array<string>
  | Array<{ id?: string; name?: string; en_name?: string; email?: string; avatar_url?: string }>
  | Array<{
      file_token?: string;
      name?: string;
      type?: string;
      size?: number;
      url?: string;
      tmp_url?: string;
    }>;

// ---------------------------------------------------------------------------
// Internal SDK record shape (what the SDK returns in list/get responses)
// ---------------------------------------------------------------------------

type LarkRecord = {
  record_id?: string;
  fields?: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
};

// ---------------------------------------------------------------------------
// Production Lark Bitable Repository
// ---------------------------------------------------------------------------

export class LarkBitableRepository implements IBitableRepository {
  private readonly appToken: string;

  constructor() {
    if (!env.LARK_BITABLE_APP_TOKEN) {
      throw new LarkIntegrationError(
        'LARK_BITABLE_APP_TOKEN is not set. Configure it before using the Bitable repository.',
        'BITABLE_NOT_CONFIGURED',
      );
    }
    this.appToken = env.LARK_BITABLE_APP_TOKEN;
  }

  private get client(): lark.Client {
    return getLarkClient();
  }

  // -------------------------------------------------------------------------
  // List records with server-side pagination
  // -------------------------------------------------------------------------

  async listRecords(
    tableId: string,
    options: ListBitableRecordsOptions = {},
  ): Promise<ListBitableRecordsResult> {
    const { pageSize = 20, pageToken, filter, sort, fieldNames } = options;

    try {
      const response = await this.client.bitable.appTableRecord.list({
        path: { app_token: this.appToken, table_id: tableId },
        params: {
          page_size: pageSize,
          ...(pageToken !== undefined && { page_token: pageToken }),
          ...(filter !== undefined && { filter }),
          ...(sort !== undefined && { sort }),
          ...(fieldNames !== undefined && { field_names: JSON.stringify(fieldNames) }),
        },
      });

      const items: LarkRecord[] = (response.data?.items ?? []) as LarkRecord[];
      const responsePageToken = response.data?.page_token;

      // Use conditional spreading to satisfy exactOptionalPropertyTypes:
      // only include optional keys when the value is actually defined.
      const result: ListBitableRecordsResult = {
        records: items.map(mapLarkRecordToInternal),
        hasMore: response.data?.has_more ?? false,
        ...(responsePageToken !== undefined && { pageToken: responsePageToken }),
        ...(response.data?.total !== undefined && { total: response.data.total }),
      };

      return result;
    } catch (err) {
      throw wrapLarkError('listRecords', err);
    }
  }

  // -------------------------------------------------------------------------
  // Get single record
  // -------------------------------------------------------------------------

  async getRecord(tableId: string, recordId: string): Promise<BitableRecord | null> {
    try {
      const response = await this.client.bitable.appTableRecord.get({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
      });

      const record = response.data?.record as LarkRecord | undefined;
      if (record === undefined) return null;

      return mapLarkRecordToInternal(record);
    } catch (err) {
      if (isNotFoundError(err)) return null;
      throw wrapLarkError('getRecord', err);
    }
  }

  async findRecordByField(
    tableId: string,
    fieldName: string,
    value: string,
  ): Promise<BitableRecord | null> {
    let pageToken: string | undefined;
    let hasMore = true;

    try {
      while (hasMore) {
        const result = await this.listRecords(tableId, {
          pageSize: 100,
          ...(pageToken !== undefined && { pageToken }),
        });
        const match = result.records.find((record) => record.fields[fieldName] === value);
        if (match !== undefined) return match;
        pageToken = result.pageToken;
        hasMore = result.hasMore && pageToken !== undefined;
      }
      return null;
    } catch (err) {
      if (err instanceof LarkIntegrationError) throw err;
      throw wrapLarkError('findRecordByField', err);
    }
  }

  // -------------------------------------------------------------------------
  // Create record — NOT retried automatically (not idempotent)
  // -------------------------------------------------------------------------

  async createRecord(tableId: string, fields: Record<string, unknown>): Promise<BitableRecord> {
    try {
      const response = await this.client.bitable.appTableRecord.create({
        path: { app_token: this.appToken, table_id: tableId },
        data: {
          // Cast to the SDK's field union type. Callers are responsible for
          // validating fields via Zod before reaching this layer.
          fields: fields as Record<string, LarkFieldValue>,
        },
      });

      if (response.code !== undefined && response.code !== 0) {
        throw new LarkIntegrationError(
          formatLarkResponseError('createRecord', response.code, response.msg),
          `LARK_${response.code}`,
        );
      }

      const record = response.data?.record as LarkRecord | undefined;
      if (record === undefined) {
        throw new LarkIntegrationError(
          'Bitable createRecord succeeded but returned no record data. Check the installed Lark SDK response shape and table configuration.',
          'CREATE_FAILED',
        );
      }

      return mapLarkRecordToInternal(record);
    } catch (err) {
      if (err instanceof LarkIntegrationError) throw err;
      throw wrapLarkError('createRecord', err);
    }
  }

  // -------------------------------------------------------------------------
  // Update record
  // -------------------------------------------------------------------------

  async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<BitableRecord> {
    try {
      const response = await this.client.bitable.appTableRecord.update({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
        data: {
          fields: fields as Record<string, LarkFieldValue>,
        },
      });

      const record = response.data?.record as LarkRecord | undefined;
      if (record === undefined) {
        throw new LarkIntegrationError(
          'Bitable updateRecord succeeded but returned no record data. Check the installed Lark SDK response shape and table configuration.',
          'UPDATE_FAILED',
        );
      }

      // If the SDK returns only patched fields, fetch the full record to guarantee complete state
      const fullRecord = await this.getRecord(tableId, recordId);
      if (fullRecord !== null) {
        return fullRecord;
      }

      return mapLarkRecordToInternal(record);
    } catch (err) {
      if (err instanceof LarkIntegrationError) throw err;
      throw wrapLarkError('updateRecord', err);
    }
  }

  // -------------------------------------------------------------------------
  // Delete record
  // -------------------------------------------------------------------------

  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    try {
      await this.client.bitable.appTableRecord.delete({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
      });
    } catch (err) {
      throw wrapLarkError('deleteRecord', err);
    }
  }

  // -------------------------------------------------------------------------
  // Connectivity check — performs a minimal read
  // -------------------------------------------------------------------------

  async checkConnectivity(): Promise<boolean> {
    try {
      // Fetch base metadata — a safe read-only operation that verifies auth + base access.
      await this.client.bitable.app.get({
        path: { app_token: this.appToken },
      });
      return true;
    } catch (err) {
      throw wrapLarkError('checkConnectivity', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapLarkRecordToInternal(record: LarkRecord): BitableRecord {
  const fields: Record<string, BitableFieldValue> = {};

  for (const [key, value] of Object.entries(record.fields ?? {})) {
    fields[key] = value as BitableFieldValue;
  }

  const result: BitableRecord = {
    recordId: record.record_id ?? '',
    fields,
  };

  // Assign optional timestamps only when present (exactOptionalPropertyTypes compliance)
  if (record.created_time !== undefined) result.createdTime = record.created_time;
  if (record.last_modified_time !== undefined) result.lastModifiedTime = record.last_modified_time;

  return result;
}

function isNotFoundError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    // Lark SDK wraps HTTP 404 / record-not-found as error code 1254040
    const code = (err as { code: unknown }).code;
    return code === 1254040 || code === 404;
  }
  return false;
}

function wrapLarkError(operation: string, err: unknown): LarkIntegrationError {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);

  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? `LARK_${String((err as { code: unknown }).code)}`
      : 'LARK_UNKNOWN';

  console.error(`[LarkBitableRepository] ${operation} failed`, { code });
  return new LarkIntegrationError(`Bitable ${operation} failed: ${sanitizeLarkMessage(message)}`, code);
}

function formatLarkResponseError(operation: string, code: number, message: string | undefined): string {
  const detail = message === undefined || message.length === 0 ? 'Lark did not provide an error message.' : sanitizeLarkMessage(message);
  return `Bitable ${operation} failed with Lark error ${code}: ${detail}. Verify the table ID and configured field names/types.`;
}

function sanitizeLarkMessage(message: string): string {
  return message
    .replace(/(app_secret|access_token|authorization|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/cli_[A-Za-z0-9_-]+/g, '[REDACTED_APP_ID]')
    .replace(/t[a-zA-Z0-9]{10,}/g, '[REDACTED_TOKEN]');
}
