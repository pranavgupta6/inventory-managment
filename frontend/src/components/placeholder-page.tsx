import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state.js';

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase?: string;
}

export function PlaceholderPage({ title, description, phase = 'Phase 2' }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8">
        <EmptyState
          icon={<Construction className="h-7 w-7" aria-hidden="true" />}
          title="Not yet implemented"
          description={`This feature is planned for ${phase}. Check the implementation roadmap for details.`}
        />
      </div>
    </div>
  );
}
