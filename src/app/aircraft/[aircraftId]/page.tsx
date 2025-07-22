
'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { Plane, Wrench, Hourglass, Calendar, CheckSquare } from 'lucide-react';
import { aircraftData, completedChecklistData } from '@/lib/data-provider';

export default function AircraftDetailPage() {
  const params = useParams();
  const aircraftId = params.aircraftId as string;
  
  const aircraft = aircraftData.find(a => a.id === aircraftId);
  const checklistHistory = completedChecklistData.filter(c => c.aircraftId === aircraftId);

  if (!aircraft) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Aircraft Not Found" />
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested aircraft could not be found.</p>
        </main>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Available': return 'success';
      case 'In Maintenance': return 'destructive';
      case 'Booked': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`Aircraft Details: ${aircraft.tailNumber}`} />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{aircraft.model}</CardTitle>
                <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
              </div>
              <Badge variant={getStatusVariant(aircraft.status)} className="text-base">{aircraft.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Hourglass className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Total Hours</p>
                <p className="text-muted-foreground">{aircraft.hours.toFixed(1)}</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Next Service ({aircraft.nextServiceType})</p>
                <p className="text-muted-foreground">{aircraft.hoursUntilService} hrs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Airworthiness</p>
                {getExpiryBadge(aircraft.airworthinessExpiry)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Insurance</p>
                {getExpiryBadge(aircraft.insuranceExpiry)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CheckSquare />
                Checklist History
            </CardTitle>
            <CardDescription>
              A log of all completed pre-flight and post-flight checklists for this aircraft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistHistory.length > 0 ? (
                  checklistHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.checklistName}</TableCell>
                      <TableCell>
                        <Badge variant={item.checklistType === 'Pre-Flight' ? 'default' : 'secondary'}>
                          {item.checklistType}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.completedBy}</TableCell>
                      <TableCell>{format(parseISO(item.completionDate), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No completed checklists found for this aircraft.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
