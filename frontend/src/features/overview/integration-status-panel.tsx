import { CheckCircle2, AlertCircle, WifiOff, Settings, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Spinner } from '@/components/ui/spinner.js';
import { useIntegrationStatus } from '@/hooks/use-health.js';
import type { IntegrationStatusLevel } from '@/types/api.js';
import { cn } from '@/lib/utils.js';

const STATUS_CONFIG: Record<
  IntegrationStatusLevel,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary';
    iconClass: string;
  }
> = {
  connected: {
    icon: CheckCircle2,
    label: 'Connected',
    badgeVariant: 'success',
    iconClass: 'text-emerald-500',
  },
  configured: {
    icon: Settings,
    label: 'Configured',
    badgeVariant: 'info' as 'warning',
    iconClass: 'text-blue-500',
  },
  not_configured: {
    icon: WifiOff,
    label: 'Not Configured',
    badgeVariant: 'secondary',
    iconClass: 'text-muted-foreground',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    badgeVariant: 'destructive',
    iconClass: 'text-destructive',
  },
};

const PROVIDER_LABELS = {
  lark: 'Lark (International)',
  feishu: 'Feishu (China)',
} as const;

export function IntegrationStatusPanel() {
  const { data: status, isLoading, isError, error, refetch, isFetching } = useIntegrationStatus();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Lark / Feishu Integration</CardTitle>
          <CardDescription>
            Connection status for the Bitable data store
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh integration status"
          title="Refresh status"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-sm text-muted-foreground">Checking integration status…</span>
          </div>
        ) : isError ? (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Could not reach backend</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'Unable to fetch status.'}
              </p>
            </div>
          </div>
        ) : status !== undefined ? (
          <>
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = STATUS_CONFIG[status.level];
                  return (
                    <>
                      <cfg.icon className={cn('h-5 w-5', cfg.iconClass)} aria-hidden="true" />
                      <span className="text-sm font-medium">Status</span>
                    </>
                  );
                })()}
              </div>
              <Badge variant={STATUS_CONFIG[status.level].badgeVariant}>
                {STATUS_CONFIG[status.level].label}
              </Badge>
            </div>

            {/* Provider */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{PROVIDER_LABELS[status.provider]}</span>
            </div>

            {/* Message */}
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">{status.message}</p>
            </div>

            {/* Table configuration */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Table Configuration
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(status.tables).map(([tableName, isConfigured]) => (
                  <div
                    key={tableName}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                  >
                    <span className="text-xs capitalize text-muted-foreground">{tableName}</span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isConfigured ? 'text-emerald-600' : 'text-muted-foreground',
                      )}
                    >
                      {isConfigured ? '✓ Set' : '— Not set'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup link */}
            {status.level === 'not_configured' && (
              <a
                href="https://open.larksuite.com/app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Open Lark Developer Console
              </a>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
