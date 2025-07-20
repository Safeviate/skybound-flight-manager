
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, ChevronRight, PlusCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Alert } from '@/lib/types';
import { mockAlerts } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from '@/components/ui/separator';

const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-6 w-6 text-destructive" />;
        case 'Yellow Tag': return <Info className="h-6 w-6 text-yellow-600" />;
        default: return null;
    }
}

export default function AlertsPage() {
  const { user } = useUser();
  const canCreateAlerts = user?.permissions.includes('Super User') || user?.permissions.includes('Alerts:Edit');

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Alerts & Notifications" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>
                Important notifications and operational alerts are displayed here.
                </CardDescription>
            </div>
            {canCreateAlerts && (
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Notification
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {mockAlerts.length > 0 ? (
                <div className="space-y-4">
                    {mockAlerts.map((alert) => (
                        <Collapsible key={alert.id} className="w-full">
                            <Card className="hover:bg-muted/50 transition-colors">
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                   <div className="flex items-start gap-4">
                                        {getAlertIcon(alert.type)}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getAlertVariant(alert.type)}>{alert.type}</Badge>
                                                <CardTitle className="text-lg">#{alert.number} - {alert.title}</CardTitle>
                                            </div>
                                            <CardDescription className="mt-2">{alert.description}</CardDescription>
                                        </div>
                                   </div>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                                      </Button>
                                    </CollapsibleTrigger>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Issued by {alert.author} on {alert.date}</p>
                                </CardContent>
                            </Card>
                            <CollapsibleContent>
                                <div className="p-4 border-t-0 border rounded-b-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold">Acknowledged By ({alert.readBy.length})</h4>
                                  </div>
                                  {alert.readBy.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {alert.readBy.map(name => (
                                        <Badge key={name} variant="secondary">{name}</Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No acknowledgements yet.</p>
                                  )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No active alerts.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
