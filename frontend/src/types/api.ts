// ---------------------------------------------------------------------------
// API response types — mirrors the backend ApiResponse shape
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    pageToken?: string;
    hasMore: boolean;
    total?: number;
  };
}

// ---------------------------------------------------------------------------
// Integration status types — mirrors backend IntegrationStatus
// ---------------------------------------------------------------------------

export type IntegrationStatusLevel = 'not_configured' | 'configured' | 'connected' | 'error';
export type LarkProvider = 'lark' | 'feishu';

export interface IntegrationStatus {
  provider: LarkProvider;
  level: IntegrationStatusLevel;
  message: string;
  errorCode?: string;
  baseConfigured: boolean;
  tables: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Inventory item types (Phase 2 — defined here for type safety)
// ---------------------------------------------------------------------------

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
// Employee types (Phase 2)
// ---------------------------------------------------------------------------

export interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName?: string;
  role?: string;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Assignment types (Phase 2)
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
// Request types (Phase 2)
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

export type UserRole = 'Admin' | 'TL' | 'Employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  department?: string;
}

export type AuditAction =
  | 'INVENTORY_CREATED'
  | 'INVENTORY_BULK_UPLOAD'
  | 'INVENTORY_UPDATED'
  | 'INVENTORY_DEACTIVATED'
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_FULFILLED'
  | 'DEVICE_ASSIGNED'
  | 'DEVICE_RETURNED'
  | 'DEVICE_REALLOCATED'
  | 'DUPLICATE_BLOCKED'
  | 'ANOMALY_DETECTED'
  | 'DELETION_BLOCKED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName?: string;
  actorRole: UserRole | 'System';
  action: AuditAction;
  entityType: 'Inventory' | 'Request' | 'Assignment' | 'BulkUpload' | 'Security';
  entityId: string;
  details: Record<string, unknown> | string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
}

export interface AuditListResult {
  records: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  duplicateCount: number;
  blockedCount: number;
}

export interface AnomalyReport {
  duplicatesBlocked: number;
  overdueAssignments: Assignment[];
  missingImeis: InventoryItem[];
  inactiveOrDamaged: InventoryItem[];
}

export interface BulkUploadItem {
  brand: string;
  deviceModel: string;
  sampleHwType?: string;
  sampleReceivedDate?: string;
  vcId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  color?: string;
  storageRam?: string;
  dateOfReceipt?: string;
  warehouseLocation?: string;
  assignedTo?: string;
  inventoryHolder?: string;
  employeeId?: string;
  assignedDate?: string;
  remarks?: string;
  status?: InventoryStatus;
}

export interface BulkUploadResult {
  importedCount: number;
  blockedCount: number;
  totalProcessed: number;
  imported: InventoryItem[];
  blocked: Array<{ item: BulkUploadItem; reason: string }>;
}

export type ReportType =
  | 'overall_inventory'
  | 'reconciliation'
  | 'overdue_returns'
  | 'duplicate_logs'
  | 'exceptions';

export type ReportTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all';

