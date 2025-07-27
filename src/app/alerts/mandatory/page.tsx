
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user-provider';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Alert as AlertType } from '@/lib/types';
import { BellRing, Check, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

const getAlertVariant = (type: AlertType['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

const getAlertIcon = (type: AlertType['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-6 w-6 text-destructive" />;
        case 'Yellow Tag': return <Info className="h-6 w-6 text-yellow-600" />;
        default: return null;
    }
}

export default function MandatoryAlertsPage() {
  const router = useRouter();
  const { user, loading, getUnacknowledgedAlerts, acknowledgeAlerts } = useUser();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [acknowledgedOnPage, setAcknowledgedOnPage] = useState<string[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const unacknowledged = getUnacknowledgedAlerts();
    if (unacknowledged.length === 0 && !loading) {
      router.push('/');
    } else {
      setAlerts(unacknowledged);
    }
  }, [user, loading, router, getUnacknowledgedAlerts]);

  const handleAcknowledgeSingle = async (alertId: string) => {
    if (!user) return;
    setAcknowledgingId(alertId);
    try {
        await acknowledgeAlerts([alertId]);
        setAcknowledgedOnPage(prev => [...prev, alertId]);
    } catch (error) {
        console.error("Failed to acknowledge alert", error);
    } finally {
        setAcknowledgingId(null);
    }
  };
  
  const handleContinue = () => {
    router.push('/');
  };

  const allAlertsAcknowledged = alerts.length > 0 && alerts.every(a => acknowledgedOnPage.includes(a.id));

  if (loading || (alerts.length === 0 && !allAlertsAcknowledged)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
       <Header title="Mandatory Alerts" />
        <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <BellRing className="text-primary"/>
                        Important Notifications
                    </CardTitle>
                    <CardDescription>
                        Please review and acknowledge each of the following alerts before proceeding.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                    {alerts.map((alert) => {
                        const isAcknowledged = acknowledgedOnPage.includes(alert.id);
                        const isAcknowledging = acknowledgingId === alert.id;
                        return (
                            <Alert key={alert.id} variant={alert.type === 'Red Tag' ? 'destructive' : 'default'} className="bg-background">
                                <div className="flex items-start gap-4">
                                    {getAlertIcon(alert.type)}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getAlertVariant(alert.type)}>{alert.type}</Badge>
                                                <AlertTitle className="font-bold text-base">#{alert.number} - {alert.title}</AlertTitle>
                                            </div>
                                             <Button 
                                                size="sm"
                                                onClick={() => handleAcknowledgeSingle(alert.id)}
                                                disabled={isAcknowledged || isAcknowledging}
                                             >
                                                {isAcknowledging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                                {isAcknowledged ? 'Acknowledged' : (isAcknowledging ? 'Saving...' : 'Acknowledge')}
                                            </Button>
                                        </div>
                                        <AlertDescription className="mt-2 text-foreground pr-24">
                                            {alert.description}
                                        </AlertDescription>
                                        <p className="text-xs text-muted-foreground mt-2">Issued by {alert.author} on {format(parseISO(alert.date), 'MMM d, yyyy')}</p>
                                    </div>
                            </div>
                            </Alert>
                        )
                    })}
                </CardContent>
                <CardFooter className="border-t pt-6">
                    <Button onClick={handleContinue} className="w-full" disabled={!allAlertsAcknowledged}>
                        Continue to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </main>
    </div>
  );
}

MandatoryAlertsPage.title = 'Mandatory Alerts';
