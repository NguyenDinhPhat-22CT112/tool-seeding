import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function SessionDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Skeleton className="h-8 w-1/2" />
      </div>

      <div className="border border-muted-foreground/10 rounded-lg p-6 space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="pt-4 border-t border-muted-foreground/10">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-6 w-full" />
        </div>

        <div className="pt-4 border-t border-muted-foreground/10">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="border border-muted-foreground/10 rounded-lg overflow-hidden">
        <div className="flex border-b border-muted-foreground/10 bg-muted-foreground/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20 mx-2 my-2" />
          ))}
        </div>

        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>
    </div>
  );
}
