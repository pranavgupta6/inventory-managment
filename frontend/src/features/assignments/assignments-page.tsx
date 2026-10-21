import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  X,
  Download,
  Share2,
  User,
  Shield,
} from 'lucide-react';
import {
  useAssignments,
  useAssignmentMutations,
  type AssignmentFilters,
  type CreateAssignmentInput,
} from '@/hooks/use-assignments.js';
import type { Assignment, AssignmentStatus } from '@/types/api.js';
import { useUserRole } from '@/context/user-role-context.js';
import { useDownloadReport } from '@/hooks/use-audit.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ErrorState } from '@/components/ui/error-state.js';
import { EmptyState } from '@/components/ui/empty-state.js';

const emptyForm: CreateAssignmentInput = {
  itemId: '',
  itemName: '',
  employeeId: '',
  employeeName: '',
  assignedAt: new Date().toISOString().slice(0, 10),
  returnedAt: '',
  notes: '',
  status: 'Active',
};

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
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function AssignmentForm({
  assignment,
  onClose,
}: {
  assignment?: Assignment;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateAssignmentInput>(
    assignment
      ? {
          itemId: assignment.itemId,
          itemName: assignment.itemName,
          employeeId: assignment.employeeId,
          employeeName: assignment.employeeName,
          assignedAt: assignment.assignedAt,
          returnedAt: assignment.returnedAt || '',
          notes: assignment.notes || '',
          status: assignment.status,
        }
      : emptyForm,
  );

  const { create, update } = useAssignmentMutations();
  const mutation = assignment ? update : create;

  const set = (name: keyof CreateAssignmentInput, value: string | AssignmentStatus) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignment) {
      update.mutate({ id: assignment.id, input: form }, { onSuccess: onClose });
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
            <CardTitle>{assignment ? 'Edit Assignment' : 'Assign Device'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {assignment
                ? 'Controlled amendment. Deletion is restricted by compliance policy.'
                : 'Directly allocate hardware to an employee.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Device Model / Name" required>
              <TextInput
                value={form.itemName}
                required
                placeholder="e.g. Tecno Camon 30 Premier"
                onChange={(val) => set('itemName', val)}
              />
            </Field>

            <Field label="Item Identifier (IMEI1 or Serial Number)" required>
              <TextInput
                value={form.itemId}
                required
                placeholder="356789012345678"
                onChange={(val) => set('itemId', val)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                System prevents assigning any device currently in active possession.
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee Name" required>
                <TextInput
                  value={form.employeeName}
                  required
                  placeholder="e.g. Garima Bhatt"
                  onChange={(val) => set('employeeName', val)}
                />
              </Field>
              <Field label="Employee ID / Email" required>
                <TextInput
                  value={form.employeeId}
                  required
                  placeholder="garima.bhatt@transsion.com"
                  onChange={(val) => set('employeeId', val)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Assigned Date" required>
                <TextInput
                  type="date"
                  value={form.assignedAt}
                  required
                  onChange={(val) => set('assignedAt', val)}
                />
              </Field>
              <Field label="Assignment Status">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as AssignmentStatus)}
                >
                  <option value="Active">Active</option>
                  <option value="Returned">Returned</option>
                </select>
              </Field>
            </div>

            <Field label="Notes / Purpose" wide>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                value={form.notes || ''}
                placeholder="Project allocation, QA sprint, accessories included..."
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>

            {mutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : 'Could not save assignment.'}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner size="sm" className="mr-1" />}
                Save Assignment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnModal({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const [returnedAt, setReturnedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const { returnAssignment } = useAssignmentMutations();

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    returnAssignment.mutate(
      {
        id: assignment.id,
        input: {
          returnedAt,
          notes: notes ? `${assignment.notes ? assignment.notes + ' | ' : ''}Return: ${notes}` : assignment.notes,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[92vh] w-full max-w-md overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Check-in Returned Device
            </CardTitle>
            <CardDescription>
              Validate return of <strong>{assignment.itemName}</strong> from <strong>{assignment.employeeName}</strong>.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p><strong>Device:</strong> {assignment.itemName} ({assignment.itemId})</p>
              <p><strong>Assigned On:</strong> {assignment.assignedAt}</p>
            </div>

            <Field label="Return Date" required>
              <TextInput
                type="date"
                value={returnedAt}
                required
                onChange={setReturnedAt}
              />
            </Field>

            <Field label="Return Condition / Remarks">
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                value={notes}
                placeholder="Hardware condition, scratches, charger returned, etc..."
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            {returnAssignment.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {returnAssignment.error instanceof Error ? returnAssignment.error.message : 'Could not process return.'}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={returnAssignment.isPending}>
                {returnAssignment.isPending && <Spinner size="sm" className="mr-1" />}
                Confirm Return & Re-stock
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReallocationModal({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [assignedAt, setAssignedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(`Reallocated after return from ${assignment.employeeName}`);
  const { create } = useAssignmentMutations();

  const handleReallocate = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        itemId: assignment.itemId,
        itemName: assignment.itemName,
        employeeName,
        employeeId,
        assignedAt,
        returnedAt: '',
        notes,
        status: 'Active',
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[92vh] w-full max-w-md overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Reallocate Returned Device
            </CardTitle>
            <CardDescription>
              Assign returned device <strong>{assignment.itemName}</strong> ({assignment.itemId}) to a new employee.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReallocate} className="space-y-4">
            <Field label="New Assignee Name" required>
              <TextInput
                value={employeeName}
                required
                placeholder="e.g. Alex Cooper"
                onChange={setEmployeeName}
              />
            </Field>

            <Field label="New Assignee Email / ID" required>
              <TextInput
                value={employeeId}
                required
                placeholder="alex.cooper@company.com"
                onChange={setEmployeeId}
              />
            </Field>

            <Field label="Reallocation Date" required>
              <TextInput
                type="date"
                value={assignedAt}
                required
                onChange={setAssignedAt}
              />
            </Field>

            <Field label="Notes / Purpose">
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background p-2.5 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            {create.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {create.error instanceof Error ? create.error.message : 'Could not reallocate device.'}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Spinner size="sm" className="mr-1" />}
                Confirm Reallocation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AssignmentsPage() {
  const [filters, setFilters] = useState<AssignmentFilters>({
    page: 1,
    pageSize: 10,
    search: '',
    status: '',
  });

  const [formItem, setFormItem] = useState<Assignment | null | undefined>(undefined);
  const [returningItem, setReturningItem] = useState<Assignment | null>(null);
  const [reallocatingItem, setReallocatingItem] = useState<Assignment | null>(null);
  const [showMyDevicesOnly, setShowMyDevicesOnly] = useState(false);

  const { data, isLoading, isError, error } = useAssignments(filters);
  const { role, user } = useUserRole();
  const { downloadAssignmentsUrl } = useDownloadReport();

  const updateFilter = <K extends keyof AssignmentFilters>(name: K, value: AssignmentFilters[K]) =>
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name !== 'page' && { page: 1 }),
    }));

  const records = data?.records || [];
  const displayedRecords = showMyDevicesOnly
    ? records.filter(
        (a) =>
          a.employeeId.toLowerCase() === user.email.toLowerCase() ||
          a.employeeId.toLowerCase() === (user.employeeId || '').toLowerCase(),
      )
    : records;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Assignments & Tracking</h2>
          <p className="text-muted-foreground text-sm">
            Track hardware allocations, enforce return validation, and manage safe reallocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Employee Runtime My Devices Tab */}
          <Button
            variant={showMyDevicesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMyDevicesOnly((prev) => !prev)}
            className="text-xs gap-1.5"
          >
            <User className="h-3.5 w-3.5" />
            {showMyDevicesOnly ? 'Showing My Assigned Devices' : 'My Devices (Runtime)'}
          </Button>

          {/* Export CSV Button (Pillar 4) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(downloadAssignmentsUrl(), '_blank')}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Details (CSV)
          </Button>

          {(role === 'Admin' || role === 'TL') && (
            <Button size="sm" onClick={() => setFormItem(null)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Compliance Note */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Reallocation Integrity Policy:</strong> Devices in active possession cannot be reassigned until returned. Deletions are strictly prohibited.
          </span>
        </span>
        <Badge variant="outline" className="text-[10px]">Zero-Deletion Policy</Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Assignments" value={data?.total ?? '—'} />
        <StatCard title="Currently Active" value={data?.activeCount ?? '—'} />
        <StatCard title="Returned & In Stock" value={data?.returnedCount ?? '—'} />
        <StatCard
          title="Active Allocations"
          value={data ? `${data.activeCount} devices` : '—'}
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <label className="relative min-w-64 flex-1">
            <span className="sr-only">Search assignments</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              placeholder="Search device name, IMEI, employee name, or employee ID"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value as AssignmentStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Returned">Returned</option>
          </select>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                message={error instanceof Error ? error.message : 'Unable to load assignments.'}
              />
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No assignments found"
                description={showMyDevicesOnly ? "No devices are currently assigned to your account." : "Assign equipment to an employee to get started."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Device Name</th>
                    <th className="px-4 py-3 font-medium">Item Identifier (IMEI)</th>
                    <th className="px-4 py-3 font-medium">Assigned To</th>
                    <th className="px-4 py-3 font-medium">Employee ID</th>
                    <th className="px-4 py-3 font-medium">Assigned Date</th>
                    <th className="px-4 py-3 font-medium">Returned Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{item.itemName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.itemId}</td>
                      <td className="px-4 py-3">{item.employeeName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.employeeId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.assignedAt}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.returnedAt || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === 'Active' ? 'success' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Return Button: visible if Active (to Assignee, TL, or Admin) */}
                          {item.status === 'Active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => setReturningItem(item)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Return
                            </Button>
                          )}

                          {/* Reallocate Button: visible if Returned (to TL or Admin) */}
                          {item.status === 'Returned' && (role === 'TL' || role === 'Admin') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1 text-primary hover:bg-primary/5"
                              onClick={() => setReallocatingItem(item)}
                            >
                              <Share2 className="h-3 w-3" />
                              Reallocate
                            </Button>
                          )}

                          {role === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setFormItem(item)}
                            >
                              Edit
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
          <span>{data ? `${data.total} assignment${data.total === 1 ? '' : 's'}` : ''}</span>
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
        <AssignmentForm
          assignment={formItem ?? undefined}
          onClose={() => setFormItem(undefined)}
        />
      )}

      {returningItem !== null && (
        <ReturnModal
          assignment={returningItem}
          onClose={() => setReturningItem(null)}
        />
      )}

      {reallocatingItem !== null && (
        <ReallocationModal
          assignment={reallocatingItem}
          onClose={() => setReallocatingItem(null)}
        />
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
