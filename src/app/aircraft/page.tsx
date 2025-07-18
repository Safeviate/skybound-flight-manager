import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { isAfter, parseISO, format, differenceInDays } from 'date-fns';

const SERVICE_INTERVALS = {
  'A-Check': 50,
  'B-Check': 100,
  'C-Check': 500,
};

const getNextService = (hours: number): { type: string; hoursUntil: number } => {
  const nextA = SERVICE_INTERVALS['A-Check'] - (hours % SERVICE_INTERVALS['A-Check']);
  const nextB = SERVICE_INTERVALS['B-Check'] - (hours % SERVICE_INTERVALS['B-Check']);
  const nextC = SERVICE_INTERVALS['C-Check'] - (hours % SERVICE_INTERVALS['C-Check']);

  let hoursUntil = nextA;
  let type = 'A-Check';

  if (nextB < hoursUntil) {
    hoursUntil = nextB;
    type = 'B-Check';
  }

  if (nextC < hoursUntil) {
    hoursUntil = nextC;
    type = 'C-Check';
  }

  return { type, hoursUntil: parseFloat(hoursUntil.toFixed(1)) };
};

const rawAircraftData = [
  { id: '1', tailNumber: 'N12345', model: 'Cessna 172 Skyhawk', status: 'Available', hours: 1250.5, airworthinessExpiry: '2025-05-20', insuranceExpiry: '2024-11-30' },
  { id: '2', tailNumber: 'N54321', model: 'Piper PA-28 Archer', status: 'In Maintenance', hours: 850.2, airworthinessExpiry: '2024-09-10', insuranceExpiry: '2025-01-15' },
  { id: '3', tailNumber: 'N67890', model: 'Diamond DA40 Star', status: 'Booked', hours: 475.8, airworthinessExpiry: '2024-07-25', insuranceExpiry: '2025-06-01' },
  { id: '4', tailNumber: 'N11223', model: 'Cirrus SR22', status: 'Available', hours: 320.0, airworthinessExpiry: '2025-03-15', insuranceExpiry: '2024-10-22' },
  { id: '5', tailNumber: 'N44556', model: 'Beechcraft G36 Bonanza', status: 'Available', hours: 2100.7, airworthinessExpiry: '2025-08-01', insuranceExpiry: '2024-12-10' },
];

const aircraftData: Aircraft[] = rawAircraftData.map(ac => {
    const nextService = getNextService(ac.hours);
    return {
        ...ac,
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
    }
})


export default function AircraftPage() {
  const getStatusVariant = (status: Aircraft['status']) => {
    switch (status) {
      case 'Available':
        return 'default';
      case 'In Maintenance':
        return 'destructive';
      case 'Booked':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getExpiryBadge = (expiryDate: string) => {
    const today = new Date();
    const date = parseISO(expiryDate);
    const daysUntil = differenceInDays(date, today);

    let variant: "default" | "secondary" | "destructive" = "default";
    if (daysUntil < 0) {
        variant = 'destructive';
    } else if (daysUntil <= 30) {
        variant = 'secondary';
    }

    const formattedDate = format(date, 'MMM d, yyyy');

    return (
        <Badge variant={variant}>{formattedDate}</Badge>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Aircraft Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aircraft Fleet</CardTitle>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flight Hours</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Hours Until</TableHead>
                  <TableHead>Airworthiness Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraftData.map((aircraft) => (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                    <TableCell>{aircraft.model}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>
                    </TableCell>
                    <TableCell>{aircraft.hours.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{aircraft.nextServiceType}</Badge>
                    </TableCell>
                    <TableCell>{aircraft.hoursUntilService}</TableCell>
                    <TableCell>{getExpiryBadge(aircraft.airworthinessExpiry)}</TableCell>
                    <TableCell>{getExpiryBadge(aircraft.insuranceExpiry)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
