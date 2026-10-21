import type {
  BitableRecord,
  ListBitableRecordsOptions,
  ListBitableRecordsResult,
} from '../../types/index.js';

// ---------------------------------------------------------------------------
// Bitable Repository Interface
// ---------------------------------------------------------------------------
// This interface defines all data-access operations the application may
// perform against a Lark Bitable table. Business logic must depend only on
// this interface — never on the SDK directly.
//
// Implementations:
//   - LarkBitableRepository  (production — wraps @larksuiteoapi/node-sdk)
//   - MockBitableRepository  (development / unit tests — never used silently)
// ---------------------------------------------------------------------------

export interface IBitableRepository {
  /**
   * List records with optional filtering, sorting, and pagination.
   * Implementations should use server-side filtering when supported and expose
   * page tokens for callers that need to scan all records.
   */
  listRecords(tableId: string, options?: ListBitableRecordsOptions): Promise<ListBitableRecordsResult>;

  /**
   * Retrieve a single record by its ID.
   * Returns null when the record does not exist.
   */
  getRecord(tableId: string, recordId: string): Promise<BitableRecord | null>;

  /**
   * Find the first record whose named field exactly matches a value.
   * Field names are supplied by trusted application code, never user input.
   */
  findRecordByField(
    tableId: string,
    fieldName: string,
    value: string,
  ): Promise<BitableRecord | null>;

  /**
   * Create a new record. Returns the created record including its assigned ID.
   * Do not retry this operation automatically — it is not idempotent.
   */
  createRecord(tableId: string, fields: Record<string, unknown>): Promise<BitableRecord>;

  /**
   * Update an existing record's fields. Returns the updated record.
   * Only the specified fields are modified; others are left unchanged.
   */
  updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<BitableRecord>;

  /**
   * Delete a record by its ID.
   */
  deleteRecord(tableId: string, recordId: string): Promise<void>;

  /**
   * Perform a lightweight read to verify that the Base is reachable and
   * the application has the necessary permissions.
   * Returns true on success. Throws a descriptive error on failure.
   */
  checkConnectivity(): Promise<boolean>;
}
