// ---------------------------------------------------------------------------
// Shared application types
// ---------------------------------------------------------------------------

/**
 * Standard API response envelope.
 * All backend routes must return this shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  /** Only included in development mode */
  details?: unknown;
}

export interface PaginationMeta {
  pageToken?: string;
  hasMore: boolean;
  total?: number;
}

// ---------------------------------------------------------------------------
// Lark / Bitable types
// ---------------------------------------------------------------------------

export type LarkProvider = 'lark' | 'feishu';

export interface BitableRecord {
  recordId: string;
  fields: Record<string, BitableFieldValue>;
  createdTime?: number;
  lastModifiedTime?: number;
}

/** Bitable field values can be a variety of types depending on column type */
export type BitableFieldValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | BitablePersonValue[]
  | BitableLinkValue[];

export interface BitablePersonValue {
  id: string;
  name?: string;
  email?: string;
}

export interface BitableLinkValue {
  text?: string;
  link?: string;
}

export interface ListBitableRecordsOptions {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  sort?: string;
  fieldNames?: string[];
}

export interface ListBitableRecordsResult {
  records: BitableRecord[];
  pageToken?: string;
  hasMore: boolean;
  total?: number;
}

export type InventoryStatus = 'Active' | 'Inactive';

export interface InventoryItem {
  itemId: string;
  brand: string;
  deviceModel: string;
  sampleHwType: string;
  imei1: string;
  imei2: string;
  serialNumber: string;
  vcId: string;
  color: string;
  storageRam: string;
  assignedDate: string;
  warehouseLocation: string;
  inventoryHolder: string;
  remarks: string;
  status: InventoryStatus;
}

export interface InventoryListResult {
  records: InventoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalByBrand: Record<string, number>;
  activeCount: number;
  inactiveCount: number;
}

// ---------------------------------------------------------------------------
// Integration status
// ---------------------------------------------------------------------------

export type IntegrationStatusLevel = 'not_configured' | 'configured' | 'connected' | 'error';

export interface IntegrationStatus {
  provider: LarkProvider;
  level: IntegrationStatusLevel;
  message: string;
  /** Present only when level === 'error' */
  errorCode?: string;
  /** Whether the Bitable base token is set */
  baseConfigured: boolean;
  /** Map of optional table IDs and whether each is set */
  tables: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Assignment types
// ---------------------------------------------------------------------------

export type AssignmentStatus = 'Active' | 'Returned';

export interface Assignment {
  id: string;
  itemId: string;
  itemName: string;
  employeeId: string;
  employeeName: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  status: AssignmentStatus;
}

export interface AssignmentListResult {
  records: Assignment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  activeCount: number;
  returnedCount: number;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
export type RequestCategory = 'Mobile' | 'Laptop' | 'Tablet' | 'Accessory' | 'Other';

export interface EquipmentRequest {
  id: string;
  requestedBy: string;
  requestedByName?: string;
  category: RequestCategory;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface EquipmentRequestListResult {
  records: EquipmentRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  fulfilledCount: number;
}

