
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AlertsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Alerts & Notifications" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Important notifications and alerts will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No active alerts.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
