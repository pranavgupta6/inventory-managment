import { useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Ban,
  Shield,
} from 'lucide-react';
import {
  useInventory,
  useInventoryMutations,
  type InventoryFilters,
  type InventoryInput,
} from '@/hooks/use-inventory.js';
import type { InventoryItem, InventoryStatus, BulkUploadItem, BulkUploadResult } from '@/types/api.js';
import { useUserRole } from '@/context/user-role-context.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ErrorState } from '@/components/ui/error-state.js';
import { EmptyState } from '@/components/ui/empty-state.js';

const brands = ['Itel', 'Tecno', 'Infinix', 'Oraimo', 'Villaon', 'Other'] as const;
const sampleTypes = ['PRO', 'PRO-1', 'PR1', 'PR1-1', 'PR2', 'PIR', 'MPR'] as const;

const emptyForm: InventoryInput & {
  sampleReceivedDate?: string;
  dateOfReceipt?: string;
  employeeId?: string;
  assignedTo?: string;
} = {
  brand: 'Other',
  deviceModel: '',
  sampleHwType: 'PRO',
  imei1: '',
  imei2: '',
  serialNumber: '',
  vcId: '',
  color: '',
  storageRam: '',
  assignedDate: new Date().toISOString().slice(0, 10),
  warehouseLocation: 'Main Warehouse',
  inventoryHolder: 'IT Stock',
  remarks: '',
  status: 'Active',
  sampleReceivedDate: new Date().toISOString().slice(0, 10),
  dateOfReceipt: new Date().toISOString().slice(0, 10),
  employeeId: '',
  assignedTo: '',
};

type FormProps = { item?: InventoryItem; onClose: () => void };

function Field({
  label,
  required,
  children,
  wide = false,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`space-y-1 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  type = 'text',
  required = false,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <input
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      type={type}
      required={required}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function InventoryForm({ item, onClose }: FormProps) {
  const [form, setForm] = useState(item ? { ...item } : emptyForm);
  const { create, update } = useInventoryMutations();
  const mutation = item ? update : create;

  const set = (name: string, value: string | InventoryStatus) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (item) {
      update.mutate({ id: item.itemId, input: form }, { onSuccess: onClose });
    } else {
      create.mutate(form as InventoryInput, { onSuccess: onClose });
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>{item ? 'Edit Device Record' : 'Register New Device'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {item
                ? 'Controlled amendment. Note that deletions are strictly prohibited by compliance policy.'
                : 'Enter all mandatory device attributes and unique identifiers.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.brand}
                required
                onChange={(e) => set('brand', e.target.value)}
              >
                {brands.map((brand) => (
                  <option key={brand}>{brand}</option>
                ))}
              </select>
            </Field>

            <Field label="Device Model" required>
              <TextInput
                value={form.deviceModel}
                required
                placeholder="e.g. Camon 30 Premier 5G"
                onChange={(val) => set('deviceModel', val)}
              />
            </Field>

            <Field label="Sample / HW Type" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.sampleHwType}
                required
                onChange={(e) => set('sampleHwType', e.target.value)}
              >
                {sampleTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>

            <Field label="IMEI1 (15 digits)" required>
              <TextInput
                value={form.imei1}
                required
                maxLength={15}
                placeholder="356789012345678"
                onChange={(val) => set('imei1', val)}
              />
            </Field>

            <Field label="IMEI2 (Optional)">
              <TextInput
                value={form.imei2 || ''}
                maxLength={15}
                placeholder="Optional second IMEI"
                onChange={(val) => set('imei2', val)}
              />
            </Field>

            <Field label="VC ID">
              <TextInput
                value={form.vcId || ''}
                placeholder="e.g. VC-88910"
                onChange={(val) => set('vcId', val)}
              />
            </Field>

            <Field label="Serial Number">
              <TextInput
                value={form.serialNumber || ''}
                placeholder="SN..."
                onChange={(val) => set('serialNumber', val)}
              />
            </Field>

            <Field label="Color">
              <TextInput
                value={form.color || ''}
                placeholder="e.g. Iceland Blue"
                onChange={(val) => set('color', val)}
              />
            </Field>

            <Field label="Storage / RAM Variant">
              <TextInput
                value={form.storageRam || ''}
                placeholder="e.g. 12GB / 256GB"
                onChange={(val) => set('storageRam', val)}
              />
            </Field>

            <Field label="Assigned Date" required>
              <TextInput
                type="date"
                value={form.assignedDate}
                required
                onChange={(val) => set('assignedDate', val)}
              />
            </Field>

            <Field label="Warehouse / Location" required>
              <TextInput
                value={form.warehouseLocation}
                required
                placeholder="e.g. Main Hub A-1"
                onChange={(val) => set('warehouseLocation', val)}
              />
            </Field>

            <Field label="Inventory Holder" required>
              <TextInput
                value={form.inventoryHolder}
                required
                placeholder="e.g. IT Stock or Employee Name"
                onChange={(val) => set('inventoryHolder', val)}
              />
            </Field>

            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => set('status', e.target.value as InventoryStatus)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive / Scrapped</option>
              </select>
            </Field>

            <Field label="Remarks Section" wide>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
                value={form.remarks || ''}
                placeholder="Optional notes, condition, or sample provenance..."
                onChange={(e) => set('remarks', e.target.value)}
              />
            </Field>

            {mutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">
                {mutation.error instanceof Error ? mutation.error.message : 'Could not save device.'}
              </div>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner size="sm" className="mr-1" />}
                Save Device
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const [csvText, setCsvText] = useState('');
  const [parsedItems, setParsedItems] = useState<BulkUploadItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { bulkUpload } = useInventoryMutations();
  const { user, role } = useUserRole();

  const sampleTemplate = `Brand,Device Model,Sample/HW Type,Sample Received Date,VC ID,IMEI1,IMEI2,Color,Storage/RAM Variant,Date of Receipt,Warehouse/Location,Assigned To (Employee Name),Employee ID,Assigned Date,Remarks Section
Tecno,Camon 30 Premier,PRO,2026-10-15,VC-10291,356789012345671,,Alps White,12GB/512GB,2026-10-15,Warehouse A,John Doe,EMP-QA-01,2026-10-16,Standard testing unit
Infinix,Note 40 Pro+,PR1,2026-10-14,VC-10292,867123456789012,,Obsidian Black,8GB/256GB,2026-10-14,Warehouse B,,EMP-DEV-02,2026-10-16,Camera benchmarking sample`;

  const downloadTemplate = () => {
    const blob = new Blob([sampleTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_bulk_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    setParseErrors([]);
    setUploadResult(null);
    const lines = text.trim().split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParseErrors(['CSV file must contain a header row and at least one data entry.']);
      setParsedItems([]);
      return;
    }

    const items: BulkUploadItem[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (row.length < 5) continue;

      const brand = row[0] || 'Other';
      const deviceModel = row[1] || '';
      const sampleHwType = row[2] || 'PRO';
      const sampleReceivedDate = row[3] || '';
      const vcId = row[4] || '';
      const imei1 = row[5] || '';
      const imei2 = row[6] || '';
      const color = row[7] || '';
      const storageRam = row[8] || '';
      const dateOfReceipt = row[9] || '';
      const warehouseLocation = row[10] || 'Main Warehouse';
      const assignedTo = row[11] || '';
      const employeeId = row[12] || '';
      const assignedDate = row[13] || new Date().toISOString().slice(0, 10);
      const remarks = row[14] || '';

      if (!deviceModel) {
        errors.push(`Row ${i}: Device Model is required.`);
      }
      if (!imei1 || !/^\d{15}$/.test(imei1)) {
        errors.push(`Row ${i}: IMEI1 '${imei1}' is invalid. Must be exactly 15 digits.`);
      }

      items.push({
        brand,
        deviceModel,
        sampleHwType,
        sampleReceivedDate,
        vcId,
        imei1,
        imei2,
        color,
        storageRam,
        dateOfReceipt,
        warehouseLocation,
        assignedTo,
        employeeId,
        assignedDate,
        remarks,
        status: 'Active',
      });
    }

    setParsedItems(items);
    setParseErrors(errors);
  };

  const handleExecuteUpload = () => {
    if (parsedItems.length === 0) return;
    bulkUpload.mutate(
      {
        items: parsedItems,
        actorId: user.email,
        actorRole: role,
      },
      {
        onSuccess: (data) => {
          setUploadResult(data);
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Bulk Inventory Upload & Verification
            </CardTitle>
            <CardDescription>
              Batch import devices with automated duplicate checkpoint validation for IMEI1, IMEI2, and VC ID.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions & Template */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
            <div>
              <p className="font-semibold text-foreground">Required 15 Fields Structure:</p>
              <p className="text-muted-foreground mt-0.5">
                Brand, Device Model, Sample/HW Type, Sample Received Date, VC ID, IMEI1, IMEI2, Color, Storage/RAM, Date of Receipt, Location, Assigned To, Employee ID, Assigned Date, Remarks.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs shrink-0">
              <Download className="h-3.5 w-3.5" />
              Download Template CSV
            </Button>
          </div>

          {/* Upload / Paste Area */}
          {!uploadResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Choose CSV File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="text-xs text-muted-foreground">or paste CSV data below:</span>
              </div>

              <textarea
                className="font-mono text-xs w-full h-32 rounded-md border border-input bg-background p-3"
                placeholder="Paste CSV rows here (with header row)..."
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCsv(e.target.value);
                }}
              />
            </div>
          )}

          {/* Validation Errors */}
          {parseErrors.length > 0 && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Validation Warnings ({parseErrors.length}):
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Results Summary (Pillar 1 Checkpoint Report) */}
          {uploadResult && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <p className="text-xs uppercase text-muted-foreground">Total Processed</p>
                  <p className="text-2xl font-bold mt-1">{uploadResult.totalProcessed}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-xs uppercase text-emerald-700 font-semibold">Imported Successfully</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-700">{uploadResult.importedCount}</p>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                  <p className="text-xs uppercase text-rose-700 font-semibold">Blocked by Duplicate Checkpoint</p>
                  <p className="text-2xl font-bold mt-1 text-rose-700">{uploadResult.blockedCount}</p>
                </div>
              </div>

              {uploadResult.blockedCount > 0 && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Ban className="h-4 w-4" />
                    Blocked Duplicate Entries (Logged to Audit Trail):
                  </h4>
                  <div className="divide-y text-xs text-rose-800 dark:text-rose-300">
                    {uploadResult.blocked.map((b, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <span>{b.reason}</span>
                        <Badge variant="destructive" className="text-[10px]">BLOCKED</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Staged Items Preview Table */}
          {!uploadResult && parsedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Preview Staged Entries ({parsedItems.length}):</p>
                <span className="text-[11px] text-muted-foreground">
                  Duplicates will be blocked and flagged upon submission.
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border text-xs">
                <table className="w-full text-left">
                  <thead className="border-b bg-muted/40 uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Brand</th>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">IMEI1</th>
                      <th className="px-3 py-2 font-medium">VC ID</th>
                      <th className="px-3 py-2 font-medium">Holder / Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5">{item.brand}</td>
                        <td className="px-3 py-1.5 font-medium">{item.deviceModel}</td>
                        <td className="px-3 py-1.5 font-mono">{item.imei1}</td>
                        <td className="px-3 py-1.5">{item.vcId || '—'}</td>
                        <td className="px-3 py-1.5">{item.assignedTo || item.inventoryHolder || 'IT Stock'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={onClose} size="sm">
              {uploadResult ? 'Done' : 'Cancel'}
            </Button>
            {!uploadResult && (
              <Button
                size="sm"
                disabled={parsedItems.length === 0 || bulkUpload.isPending}
                onClick={handleExecuteUpload}
              >
                {bulkUpload.isPending && <Spinner size="sm" className="mr-1" />}
                Validate & Import ({parsedItems.length} Devices)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const columns = [
  'Brand',
  'Device Model',
  'Sample / HW Type',
  'IMEI1',
  'IMEI2',
  'Serial Number',
  'Assigned Date',
  'Warehouse / Location',
  'Inventory Holder',
  'Status',
];

export function InventoryPage() {
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    pageSize: 10,
    search: '',
    brand: '',
    status: '',
  });
  const [formItem, setFormItem] = useState<InventoryItem | null | undefined>(undefined);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const { data, isLoading, isError, error } = useInventory(filters);
  const { deactivate } = useInventoryMutations();
  const { role } = useUserRole();

  const updateFilter = <K extends keyof InventoryFilters>(name: K, value: InventoryFilters[K]) =>
    setFilters((current) => ({ ...current, [name]: value, ...(name !== 'page' && { page: 1 }) }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Inventory</h2>
          <p className="text-muted-foreground text-sm">
            Catalog of tracked mobile hardware. Deletions restricted by compliance policy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Upload Button (Visible to Admin & TL) */}
          {(role === 'Admin' || role === 'TL') && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkUpload(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          )}
          {role === 'Admin' && (
            <Button size="sm" onClick={() => setFormItem(null)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          )}
        </div>
      </div>

      {/* Compliance Alert Note (Pillar 3 & 7) */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Audit Policy Active:</strong> Hard deletion is strictly disabled. Entries can be amended with justification or marked as Inactive.
          </span>
        </span>
        <Badge variant="outline" className="text-[10px]">Zero-Deletion Enabled</Badge>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total devices" value={data?.total ?? '—'} />
        <Stat title="Active devices" value={data?.activeCount ?? '—'} />
        <Stat title="Inactive devices" value={data?.inactiveCount ?? '—'} />
        <Stat
          title="Brands represented"
          value={data ? Object.keys(data.totalByBrand).length : '—'}
        />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <label className="relative min-w-64 flex-1">
            <span className="sr-only">Search devices</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              placeholder="Search brand, model, IMEI, serial, VC ID, location, holder"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter brand"
            value={filters.brand}
            onChange={(e) => updateFilter('brand', e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand}>{brand}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value as InventoryStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                message={error instanceof Error ? error.message : 'Unable to load devices.'}
              />
            </div>
          ) : data?.records.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No devices found" description="Add a device or adjust your filters." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    {columns.map((column) => (
                      <th className="px-4 py-3 font-medium" key={column}>
                        {column}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.records.map((item) => (
                    <tr key={item.itemId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{item.brand}</td>
                      <td className="px-4 py-3 font-medium">{item.deviceModel}</td>
                      <td className="px-4 py-3">{item.sampleHwType}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.imei1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.imei2 || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.serialNumber || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.assignedDate}</td>
                      <td className="px-4 py-3">{item.warehouseLocation}</td>
                      <td className="px-4 py-3">{item.inventoryHolder}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === 'Active' ? 'success' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setFormItem(item)}
                          >
                            Edit
                          </Button>
                          {item.status === 'Active' && role === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (window.confirm(`Deactivate "${item.deviceModel}"?`)) {
                                  deactivate.mutate(item.itemId);
                                }
                              }}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{data ? `${data.total} device${data.total === 1 ? '' : 's'}` : ''}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data || filters.page <= 1}
              onClick={() => updateFilter('page', filters.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span>
              Page {filters.page} of {data?.totalPages ?? '—'}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || filters.page >= data.totalPages}
              onClick={() => updateFilter('page', filters.page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit/Add Form Modal */}
      {formItem !== undefined && (
        <InventoryForm item={formItem ?? undefined} onClose={() => setFormItem(undefined)} />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} />}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
