import { useState } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  Search,
  Download,
  Clock,
  Ban,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  useAuditLogs,
  useAnomalies,
  useDownloadReport,
  type AuditFilters,
} from '@/hooks/use-audit.js';
import type { ReportType, ReportTimeframe } from '@/types/api.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Spinner } from '@/components/ui/spinner.js';
import { EmptyState } from '@/components/ui/empty-state.js';
import { ErrorState } from '@/components/ui/error-state.js';

export function AuditPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<ReportTimeframe>('monthly');
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    pageSize: 20,
    search: '',
    action: '',
    status: '',
  });

  const { data: auditData, isLoading: logsLoading, isError: logsError } = useAuditLogs(filters);
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalies();
  const { downloadReportUrl } = useDownloadReport();

  const handleDownload = (type: ReportType) => {
    const url = downloadReportUrl(type, selectedTimeframe);
    window.open(url, '_blank');
  };

  const updateFilter = <K extends keyof AuditFilters>(name: K, value: AuditFilters[K]) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name !== 'page' && { page: 1 }),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit & Compliance Reports</h2>
          <p className="text-muted-foreground">
            Multi-tier audit logs, duplicate attempt checkpoints, anomaly alerts, and scheduled reporting.
          </p>
        </div>
      </div>

      {/* Anomaly Alerts Section */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          System Anomaly & Integrity Alerts
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-600">Duplicate Checkpoints Blocked</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {anomaliesLoading ? '…' : anomalies?.duplicatesBlocked ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-full text-amber-600">
                  <Ban className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                IMEI1 / IMEI2 / VC ID duplication attempts blocked.
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-600">Overdue Returns (&gt;30d)</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {anomaliesLoading ? '…' : anomalies?.overdueAssignments.length ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Devices assigned with usage exceeding standard duration.
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-500/20 bg-rose-500/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-rose-600">Missing / Incomplete IMEIs</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {anomaliesLoading ? '…' : anomalies?.missingImeis.length ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-full text-rose-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Inventory records without standard 15-digit primary identifier.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-500/20 bg-slate-500/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Exceptions / Damaged</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {anomaliesLoading ? '…' : anomalies?.inactiveOrDamaged.length ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-500/10 rounded-full text-muted-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Deactivated or hardware flagged for damage/scrap.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reports Download Hub */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Compliance Report Center
            </CardTitle>
            <CardDescription>
              Export scheduled reconciliation summaries and audit records for external compliance.
            </CardDescription>
          </div>
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Reporting Range:</span>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as ReportTimeframe)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm"
              aria-label="Select Report Timeframe"
            >
              <option value="daily">Daily (Today)</option>
              <option value="weekly">Weekly (Last 7 Days)</option>
              <option value="monthly">Monthly (Last 30 Days)</option>
              <option value="quarterly">Quarterly (Last 90 Days)</option>
              <option value="all">All-Time Catalog</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ReportCard
              title="Overall Inventory"
              description="Complete hardware specifications, locations, and holders"
              icon={FileSpreadsheet}
              onDownload={() => handleDownload('overall_inventory')}
            />
            <ReportCard
              title="Inventory Reconciliation"
              description="Received vs. Assigned vs. Returned breakdown"
              icon={CheckCircle2}
              onDownload={() => handleDownload('reconciliation')}
            />
            <ReportCard
              title="Overdue Returns"
              description="Unreturned devices exceeding standard usage period"
              icon={Clock}
              onDownload={() => handleDownload('overdue_returns')}
            />
            <ReportCard
              title="Duplicate Attempt Logs"
              description="Checkpoint blocked records & duplicate IMEIs/VC IDs"
              icon={Ban}
              onDownload={() => handleDownload('duplicate_logs')}
            />
            <ReportCard
              title="Exceptions & Damaged"
              description="Decommissioned, lost, or damaged inventory tracking"
              icon={AlertTriangle}
              onDownload={() => handleDownload('exceptions')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Immutable Activity & Audit Trail
              </CardTitle>
              <CardDescription>
                Zero-deletion policy: all creation, allocation, return, and duplicate block attempts are permanently logged.
              </CardDescription>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                />
              </div>

              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
                aria-label="Filter status"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="BLOCKED">Blocked</option>
                <option value="FLAGGED">Flagged</option>
              </select>

              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={filters.actorRole || ''}
                onChange={(e) => updateFilter('actorRole', e.target.value)}
                aria-label="Filter role"
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="TL">Team Lead (TL)</option>
                <option value="Employee">Employee</option>
                <option value="System">System</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          ) : logsError ? (
            <div className="p-6">
              <ErrorState message="Failed to load audit logs from disk repository." />
            </div>
          ) : auditData?.records.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No logs found" description="No audit activities match the current filters." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b bg-muted/50 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Entity / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditData?.records.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono">
                        {entry.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div>{entry.actorName || entry.actorId}</div>
                        {entry.actorName && (
                          <div className="text-[10px] text-muted-foreground">{entry.actorId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.actorRole}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.status === 'BLOCKED' ? (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <Ban className="h-3 w-3" />
                            BLOCKED
                          </Badge>
                        ) : entry.status === 'FLAGGED' ? (
                          <Badge variant="warning" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />
                            FLAGGED
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            SUCCESS
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="line-clamp-2 text-muted-foreground">
                          {formatDetails(entry.details)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportCard({
  title,
  description,
  icon: Icon,
  onDownload,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 flex flex-col justify-between hover:border-primary/50 transition-colors bg-card">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-md text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onDownload} className="w-full gap-2 text-xs">
        <Download className="h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  );
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDetails(details: Record<string, unknown> | string): string {
  if (typeof details === 'string') return details;
  if (!details || Object.keys(details).length === 0) return '—';
  if (details.reason) return String(details.reason);
  if (details.error) return String(details.error);
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
}
