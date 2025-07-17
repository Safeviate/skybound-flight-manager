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

const aircraftData: Aircraft[] = [
  { id: '1', tailNumber: 'N12345', model: 'Cessna 172 Skyhawk', status: 'Available', hours: 1250.5 },
  { id: '2', tailNumber: 'N54321', model: 'Piper PA-28 Archer', status: 'In Maintenance', hours: 850.2 },
  { id: '3', tailNumber: 'N67890', model: 'Diamond DA40 Star', status: 'Booked', hours: 475.8 },
  { id: '4', tailNumber: 'N11223', model: 'Cirrus SR22', status: 'Available', hours: 320.0 },
  { id: '5', tailNumber: 'N44556', model: 'Beechcraft G36 Bonanza', status: 'Available', hours: 2100.7 },
];

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
                  <TableHead className="text-right">Flight Hours</TableHead>
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
                    <TableCell className="text-right">{aircraft.hours.toFixed(1)}</TableCell>
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
