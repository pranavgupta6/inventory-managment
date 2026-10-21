import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import {
  useRequests,
  useRequestMutations,
  type CreateRequestInput,
  type RequestFilters,
} from '@/hooks/use-requests.js';
import { useInventory } from '@/hooks/use-inventory.js';
import { useUserRole } from '@/context/user-role-context.js';
import type { EquipmentRequest, RequestCategory, RequestStatus } from '@/types/api.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ErrorState } from '@/components/ui/error-state.js';
import { EmptyState } from '@/components/ui/empty-state.js';

const categories: RequestCategory[] = ['Mobile', 'Laptop', 'Tablet', 'Accessory', 'Other'];
const statuses: RequestStatus[] = ['Pending', 'Approved', 'Rejected', 'Fulfilled'];

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

function RequestModal({
  request,
  onClose,
}: {
  request?: EquipmentRequest;
  onClose: () => void;
}) {
  const { user } = useUserRole();

  const [form, setForm] = useState<CreateRequestInput>(
    request
      ? {
          requestedBy: request.requestedBy,
          requestedByName: request.requestedByName || '',
          category: request.category,
          description: request.description,
          purpose: '',
          projectDepartment: '',
          duration: '',
          preferredDevice: '',
          notes: request.notes || '',
        }
      : {
          requestedBy: user.email,
          requestedByName: user.name,
          category: 'Mobile',
          description: '',
          purpose: '',
          projectDepartment: user.department || 'Engineering',
          duration: '30 days',
          preferredDevice: '',
          notes: 'Approver: Team Lead',
        },
  );

  const { create, update } = useRequestMutations();
  const mutation = request ? update : create;

  const set = (name: keyof CreateRequestInput, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (request) {
      update.mutate({ id: request.id, input: form }, { onSuccess: onClose });
    } else {
      create.mutate(form, { onSuccess: onClose });
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[92vh] w-full max-w-xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>{request ? 'Edit Request' : 'Submit Equipment Requisition'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Specify purpose, duration, and preferred hardware for Team Lead review.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Requester Name" required>
                <TextInput
                  value={form.requestedByName || ''}
                  required
                  placeholder="e.g. Garima Bhatt"
                  onChange={(val) => set('requestedByName', val)}
                />
              </Field>
              <Field label="Requester Email / ID" required>
                <TextInput
                  value={form.requestedBy}
                  required
                  placeholder="name@company.com"
                  onChange={(val) => set('requestedBy', val)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project / Department" required>
                <TextInput
                  value={form.projectDepartment || ''}
                  required
                  placeholder="e.g. Gaming QA Benchmarking"
                  onChange={(val) => set('projectDepartment', val)}
                />
              </Field>
              <Field label="Duration / Expected Return" required>
                <TextInput
                  value={form.duration || ''}
                  required
                  placeholder="e.g. 14 days or 2026-11-15"
                  onChange={(val) => set('duration', val)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" required>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as RequestCategory)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred Device (Brand / Model)" required>
                <TextInput
                  value={form.preferredDevice || ''}
                  required
                  placeholder="e.g. Tecno Camon 30 Premier (12GB RAM)"
                  onChange={(val) => set('preferredDevice', val)}
                />
              </Field>
            </div>

            <Field label="Purpose of Requisition" required>
              <TextInput
                value={form.purpose || ''}
                required
                placeholder="e.g. Validation of high-refresh rate displays and GPS geofence"
                onChange={(val) => set('purpose', val)}
              />
            </Field>

            <Field label="Detailed Description & Justification" required>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                required
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Explain the testing scope, why this device is needed, and any special requirements..."
              />
            </Field>

            <Field label="Approval Authority">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.notes?.startsWith('Approver:') ? form.notes.split(' | ')[0] : 'Approver: Team Lead'}
                onChange={(e) => {
                  const target = e.target.value;
                  const rest = form.notes?.includes(' | ') ? form.notes.split(' | ').slice(1).join(' | ') : '';
                  set('notes', rest ? `${target} | ${rest}` : target);
                }}
              >
                <option value="Approver: Team Lead">Team Lead (Engineering / QA)</option>
                <option value="Approver: Admin">Admin (IT Operations)</option>
              </select>
            </Field>

            {mutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : 'Could not submit request.'}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner size="sm" className="mr-1" />}
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ApprovalModal({
  request,
  onClose,
}: {
  request: EquipmentRequest;
  onClose: () => void;
}) {
  const { data: inventoryData } = useInventory({
    page: 1,
    pageSize: 100,
    search: '',
    brand: '',
    status: 'Inactive',
  });
  const { updateStatus } = useRequestMutations();
  const { user, role } = useUserRole();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const inventoryItems = inventoryData?.records || [];

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalError(null);

    const chosenItem = inventoryItems.find((i) => i.imei1 === selectedItemId || i.itemId === selectedItemId);
    const assignedDeviceName = chosenItem
      ? `${chosenItem.brand} ${chosenItem.deviceModel}`
      : request.description.slice(0, 50);

    updateStatus.mutate(
      {
        id: request.id,
        input: {
          status: 'Approved',
          assignedItemId: selectedItemId || undefined,
          assignedDeviceName,
          assignedDate: new Date().toISOString().slice(0, 10),
          remarks: remarks || `Approved by ${user.name} (${role})`,
          actorId: user.email,
          actorRole: role,
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          setApprovalError(err instanceof Error ? err.message : 'Approval failed');
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
      <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Approve & Assign Device
            </CardTitle>
            <CardDescription>
              Review request from <strong>{request.requestedByName || request.requestedBy}</strong> and assign hardware.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p><strong>Category:</strong> {request.category}</p>
              <p><strong>Description:</strong> {request.description}</p>
              {request.notes && <p className="text-muted-foreground"><strong>Notes:</strong> {request.notes}</p>}
            </div>

            <Field label="Allocate Device from Available Stock">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Choose from available inventory --</option>
                {inventoryItems.map((item) => (
                  <option key={item.itemId} value={item.imei1 || item.itemId}>
                    {item.brand} {item.deviceModel} (IMEI: {item.imei1}) - {item.storageRam || item.color || item.warehouseLocation}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                System prevents assigning any device currently held until marked as Returned.
              </p>
            </Field>

            <Field label="Approval Remarks & Instructions">
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Device assigned for 30 days. Return after completing QA sprint."
              />
            </Field>

            {approvalError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {approvalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStatus.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {updateStatus.isPending && <Spinner size="sm" className="mr-1" />}
                Approve & Notify Requester
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RejectionModal({
  request,
  onClose,
}: {
  request: EquipmentRequest;
  onClose: () => void;
}) {
  const { updateStatus } = useRequestMutations();
  const { user, role } = useUserRole();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError('A rejection reason is mandatory to notify the requester.');
      return;
    }
    setError(null);

    updateStatus.mutate(
      {
        id: request.id,
        input: {
          status: 'Rejected',
          remarks: remarks.trim(),
          actorId: user.email,
          actorRole: role,
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Rejection failed');
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
      <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Reject Request
            </CardTitle>
            <CardDescription>
              Provide clear remarks for <strong>{request.requestedByName || request.requestedBy}</strong>.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReject} className="space-y-4">
            <Field label="Rejection Reason / Remarks" required>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Requested model is currently out of stock. Please select another variant or re-request next week."
              />
            </Field>

            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={updateStatus.isPending}>
                {updateStatus.isPending && <Spinner size="sm" className="mr-1" />}
                Confirm Rejection & Send Email
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  switch (status) {
    case 'Approved':
      return <Badge variant="success">Approved</Badge>;
    case 'Pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'Fulfilled':
      return <Badge variant="default">Fulfilled</Badge>;
    case 'Rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function RequestsPage() {
  const [filters, setFilters] = useState<RequestFilters>({
    page: 1,
    pageSize: 10,
    search: '',
    category: '',
    status: '',
  });

  const [formItem, setFormItem] = useState<EquipmentRequest | null | undefined>(undefined);
  const [approvingItem, setApprovingItem] = useState<EquipmentRequest | null>(null);
  const [rejectingItem, setRejectingItem] = useState<EquipmentRequest | null>(null);
  const [onlyMyRequests, setOnlyMyRequests] = useState(false);

  const { data, isLoading, isError, error } = useRequests(filters);
  const { role, user } = useUserRole();

  const updateFilter = <K extends keyof RequestFilters>(name: K, value: RequestFilters[K]) =>
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name !== 'page' && { page: 1 }),
    }));

  const displayedRecords = onlyMyRequests
    ? (data?.records || []).filter((r) => r.requestedBy.toLowerCase() === user.email.toLowerCase())
    : data?.records || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipment Requests</h2>
          <p className="text-muted-foreground text-sm">
            Raise requests, conduct Team Lead reviews, and manage device assignment notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {role === 'Employee' && (
            <Button
              variant={onlyMyRequests ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setOnlyMyRequests((prev) => !prev)}
              className="text-xs"
            >
              {onlyMyRequests ? 'Showing My Requests' : 'Filter: My Requests'}
            </Button>
          )}
          <Button size="sm" onClick={() => setFormItem(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Raise New Request
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Requests" value={data?.total ?? '—'} />
        <StatCard title="Pending Review" value={data?.pendingCount ?? '—'} />
        <StatCard title="Approved" value={data?.approvedCount ?? '—'} />
        <StatCard title="Fulfilled" value={data?.fulfilledCount ?? '—'} />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <label className="relative min-w-64 flex-1">
            <span className="sr-only">Search requests</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              placeholder="Search requester, department, purpose, or device specs"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter category"
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value as RequestCategory | '')}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value as RequestStatus | '')}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                message={error instanceof Error ? error.message : 'Unable to load equipment requests.'}
              />
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No requests found"
                description={onlyMyRequests ? "You haven't submitted any equipment requests yet." : "Submit an equipment request to get started."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Requested By</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Requisition Details & Purpose</th>
                    <th className="px-4 py-3 font-medium">Requested Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{item.requestedByName || item.requestedBy}</div>
                        <div className="text-xs text-muted-foreground">{item.requestedBy}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="line-clamp-2 text-foreground">{item.description}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1 italic mt-0.5">
                            Note: {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'Pending' && (role === 'TL' || role === 'Admin') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7"
                                onClick={() => setApprovingItem(item)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-destructive hover:text-destructive h-7"
                                onClick={() => setRejectingItem(item)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setFormItem(item)}>
                            View
                          </Button>
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
          <span>{data ? `${data.total} request${data.total === 1 ? '' : 's'}` : ''}</span>
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

      {/* Modals */}
      {formItem !== undefined && (
        <RequestModal request={formItem ?? undefined} onClose={() => setFormItem(undefined)} />
      )}

      {approvingItem && (
        <ApprovalModal request={approvingItem} onClose={() => setApprovingItem(null)} />
      )}

      {rejectingItem && (
        <RejectionModal request={rejectingItem} onClose={() => setRejectingItem(null)} />
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
