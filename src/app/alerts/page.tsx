
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Alert = {
  id: string;
  number: number;
  type: 'Red Tag' | 'Yellow Tag';
  title: string;
  description: string;
  author: string;
  date: string;
};

const mockAlerts: Alert[] = [
  {
    id: '1',
    number: 1,
    type: 'Red Tag',
    title: 'GROUND ALL AIRCRAFT - SEVERE WEATHER',
    description: 'All flight operations are suspended immediately due to severe thunderstorms in the vicinity. No takeoffs or landings permitted until further notice.',
    author: 'John Smith, Safety Manager',
    date: '2024-08-16',
  },
  {
    id: '2',
    number: 1,
    type: 'Yellow Tag',
    title: 'Runway 31 Closed for Maintenance',
    description: 'Runway 31 will be closed for minor repairs from 14:00 to 17:00 local time today. Plan all operations for Runway 13.',
    author: 'Mike Ross, Chief Flight Instructor',
    date: '2024-08-16',
  },
  {
    id: '3',
    number: 2,
    type: 'Yellow Tag',
    title: 'Increased Bird Activity Reported',
    description: 'Multiple reports of increased bird activity on the final approach path for Runway 13. Pilots are advised to exercise extreme caution.',
    author: 'Safety Department',
    date: '2024-08-15',
  },
];

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
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Alerts & Notifications" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Important notifications and operational alerts are displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mockAlerts.length > 0 ? (
                <div className="space-y-4">
                    {mockAlerts.map((alert) => (
                        <button key={alert.id} className="w-full text-left">
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
                                    <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Issued by {alert.author} on {alert.date}</p>
                                </CardContent>
                            </Card>
                        </button>
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
