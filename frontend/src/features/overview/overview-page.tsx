import { useMemo } from 'react';
import {
  Package,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  Download,
  Ban,
  CheckCircle2,
  Boxes,
  Cpu,
  Clock,
  User,
} from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory.js';
import { useAssignments } from '@/hooks/use-assignments.js';
import { useRequests } from '@/hooks/use-requests.js';
import { useDuplicateAlerts, useDownloadReport } from '@/hooks/use-audit.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const { data: inventoryData } = useInventory({
    page: 1,
    pageSize: 1000,
    search: '',
    brand: '',
    status: '',
  });

  const { data: assignmentsData } = useAssignments({
    page: 1,
    pageSize: 1000,
    search: '',
    status: '',
  });

  const { data: requestsData } = useRequests({
    page: 1,
    pageSize: 10,
    search: '',
    category: '',
    status: '',
  });

  const { data: duplicateAlerts } = useDuplicateAlerts();
  const { downloadAssignmentsUrl } = useDownloadReport();

  // Stock Overview Breakdowns
  const inventoryItems = inventoryData?.records || [];
  const assignments = assignmentsData?.records || [];

  // Stock by Brand
  const brandBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of inventoryItems) {
      counts[item.brand] = (counts[item.brand] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  // Stock by HW Stage
  const hwStageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of inventoryItems) {
      const type = item.sampleHwType || 'PRO';
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  // Stock by Model & Variant
  const modelBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; brand: string; variants: Set<string> }> = {};
    for (const item of inventoryItems) {
      if (!counts[item.deviceModel]) {
        counts[item.deviceModel] = { count: 0, brand: item.brand, variants: new Set() };
      }
      counts[item.deviceModel]!.count += 1;
      if (item.storageRam) counts[item.deviceModel]!.variants.add(item.storageRam);
    }
    return Object.entries(counts)
      .map(([model, data]) => ({
        model,
        brand: data.brand,
        count: data.count,
        variants: Array.from(data.variants).join(', ') || 'Standard',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [inventoryItems]);

  // Employee Allocations Aggregate
  const employeeAllocations = useMemo(() => {
    const map = new Map<string, {
      employeeName: string;
      employeeId: string;
      assignedDate: string;
      totalAssigned: number;
      devices: string[];
    }>();

    for (const a of assignments) {
      if (a.status !== 'Active') continue;
      const key = a.employeeId || a.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          employeeName: a.employeeName,
          employeeId: a.employeeId,
          assignedDate: a.assignedAt,
          totalAssigned: 0,
          devices: [],
        });
      }
      const record = map.get(key)!;
      record.totalAssigned += 1;
      record.devices.push(a.itemName);
      if (a.assignedAt > record.assignedDate) {
        record.assignedDate = a.assignedAt;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [assignments]);

  // Derived counts
  const totalStock = inventoryItems.length;
  const currentlyAssigned = assignments.filter((a) => a.status === 'Active').length;
  const returnedCount = assignments.filter((a) => a.status === 'Returned').length;
  const availableStock = Math.max(0, totalStock - currentlyAssigned);
  const inactiveDamagedCount = inventoryItems.filter(
    (i) => i.status === 'Inactive' || (i.remarks && /damage|scrap|broken/i.test(i.remarks)),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enterprise Inventory Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Centralized hardware lifecycle, allocation tracking, checkpoint alerts, and stock monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(downloadAssignmentsUrl(), '_blank')}
            className="gap-2 text-xs"
          >
            <Download className="h-4 w-4" />
            Download Assignment Details (CSV)
          </Button>
          <Button size="sm" asChild className="text-xs">
            <Link to="/inventory">
              <Boxes className="mr-1.5 h-4 w-4" />
              Manage Inventory
            </Link>
          </Button>
        </div>
      </div>

      {/* Duplicate Checkpoint Alerts Banner (Pillar 3 & 4) */}
      {(duplicateAlerts && duplicateAlerts.length > 0) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-md text-amber-700 dark:text-amber-400 mt-0.5">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                  Duplicate Checkpoint Active: {duplicateAlerts.length} Blocked Attempts Logged
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  System validated IMEI1 / IMEI2 / VC ID and blocked duplicate entries from entering the database.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-amber-900 hover:bg-amber-500/20">
              <Link to="/reports">View Audit Logs &rarr;</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Assignment Status Cards (Pillar 4) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Total in Catalog</p>
                <p className="text-2xl font-bold mt-1">{totalStock}</p>
              </div>
              <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">All devices in system</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">Available / In Stock</p>
                <p className="text-2xl font-bold mt-1 text-emerald-700">{availableStock}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Ready for allocation</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Currently Assigned</p>
                <p className="text-2xl font-bold mt-1 text-blue-700">{currentlyAssigned}</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Held by team members</p>
          </CardContent>
        </Card>

        <Card className="border-slate-500/30 bg-slate-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Historical Returns</p>
                <p className="text-2xl font-bold mt-1">{returnedCount}</p>
              </div>
              <div className="p-2.5 bg-slate-500/10 rounded-lg text-muted-foreground">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Check-in confirmed</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-700">Damaged / Inactive</p>
                <p className="text-2xl font-bold mt-1 text-rose-700">{inactiveDamagedCount}</p>
              </div>
              <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Deactivated or flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Overview (Brand / Stage / Model) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Brand Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              Stock by Brand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No inventory items loaded.</p>
            ) : (
              <div className="space-y-3">
                {brandBreakdown.map(([brand, count]) => {
                  const pct = totalStock > 0 ? Math.round((count / totalStock) * 100) : 0;
                  return (
                    <div key={brand} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{brand}</span>
                        <span className="text-muted-foreground font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* HW Stage Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              Stock by HW Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hwStageBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No hardware stages tracked.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {hwStageBreakdown.map(([stage, count]) => (
                  <div key={stage} className="p-2.5 rounded-lg border bg-muted/20 text-center">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">{stage}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Models & Variants */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              Device Models & Variants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modelBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No models recorded.</p>
            ) : (
              <div className="divide-y text-xs">
                {modelBreakdown.map((item) => (
                  <div key={item.model} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.brand} {item.model}</p>
                      <p className="text-[10px] text-muted-foreground">{item.variants}</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Allocation Table (Pillar 4) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Active Employee Allocation Roster
            </CardTitle>
            <CardDescription className="text-xs">
              Live tally of devices currently in active possession by employees.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/assignments">View All Assignments &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {employeeAllocations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No active employee assignments.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b bg-muted/40 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Employee Name</th>
                    <th className="px-4 py-2.5 font-medium">Employee ID / Email</th>
                    <th className="px-4 py-2.5 font-medium">Assigned Date</th>
                    <th className="px-4 py-2.5 font-medium">Total Samples Assigned</th>
                    <th className="px-4 py-2.5 font-medium">Current Devices</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeAllocations.slice(0, 10).map((emp) => (
                    <tr key={emp.employeeId || emp.employeeName} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold text-foreground">{emp.employeeName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono">{emp.employeeId}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{emp.assignedDate}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="default" className="font-mono">
                          {emp.totalAssigned} device{emp.totalAssigned > 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate text-muted-foreground" title={emp.devices.join(', ')}>
                        {emp.devices.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests with Approval Status (Pillar 4) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Pending Equipment Requisitions
            </CardTitle>
            <CardDescription className="text-xs">
              Hardware requests awaiting TL review and device provisioning.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/requests">Manage Requests &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!requestsData || requestsData.records.filter((r) => r.status === 'Pending').length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No pending equipment requests. All requests have been reviewed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b bg-muted/40 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Requester</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Details & Purpose</th>
                    <th className="px-4 py-2.5 font-medium">Requested Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requestsData.records
                    .filter((r) => r.status === 'Pending')
                    .slice(0, 5)
                    .map((req) => (
                      <tr key={req.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">
                          {req.requestedByName || req.requestedBy}
                          <span className="block text-[10px] text-muted-foreground">{req.requestedBy}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline">{req.category}</Badge>
                        </td>
                        <td className="px-4 py-2.5 max-w-sm truncate" title={req.description}>
                          {req.description}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{req.createdAt.slice(0, 10)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="warning">Pending TL Review</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button size="sm" variant="outline" asChild className="text-xs h-7">
                            <Link to="/requests">Review & Approve</Link>
                          </Button>
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
