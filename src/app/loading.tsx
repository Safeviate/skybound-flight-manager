
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-2/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <Skeleton className="h-5 w-2/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-2/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
           <Skeleton className="h-4 w-2/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
