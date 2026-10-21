import { ArrowLeftRight, CheckCircle2, Package } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory.js';
import { useAssignments } from '@/hooks/use-assignments.js';
import { Card, CardContent } from '@/components/ui/card.js';

export function OverviewPage() {
  const { data: inventoryData } = useInventory({
    page: 1,
    pageSize: 100,
    search: '',
    brand: '',
    status: '',
  });

  const { data: assignmentsData } = useAssignments({
    page: 1,
    pageSize: 100,
    search: '',
    status: '',
  });

  const catalogDevices = inventoryData?.total ?? 0;
  const totalDevices = (inventoryData?.activeCount ?? 0) + (inventoryData?.inactiveCount ?? 0);
  const currentlyAssigned = assignmentsData?.activeCount ?? 0;
  const availableDevices = inventoryData?.inactiveCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          A focused view of the current device inventory and allocation status.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total"
          value={totalDevices}
          description="Total inventory records"
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Devices in Catalog"
          value={catalogDevices}
          description="Devices currently loaded"
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Available"
          value={availableDevices}
          description="Ready for allocation"
          icon={<CheckCircle2 className="h-5 w-5" />}
          className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
        />
        <MetricCard
          title="Currently Assigned"
          value={currentlyAssigned}
          description="Held by team members"
          icon={<ArrowLeftRight className="h-5 w-5" />}
          className="border-blue-500/30 bg-blue-500/5 text-blue-700"
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  className = '',
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
