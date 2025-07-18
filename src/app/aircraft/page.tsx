
'use client';

import { useState } from 'react';
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
import type { Aircraft, Booking, Checklist } from '@/lib/types';
import { ClipboardCheck, PlusCircle } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { aircraftData, bookingData, checklistData } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCard } from '../checklists/checklist-card';


export default function AircraftPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(checklistData);
  const [bookings, setBookings] = useState<Booking[]>(bookingData);

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => (c.id === updatedChecklist.id ? updatedChecklist : c))
    );

    const isComplete = updatedChecklist.items.every(item => item.completed);
    if (isComplete && updatedChecklist.aircraftId) {
        setBookings(prevBookings => 
            prevBookings.map(booking => {
                const aircraft = aircraftData.find(ac => ac.id === updatedChecklist.aircraftId);
                if (aircraft && booking.aircraft === aircraft.tailNumber && booking.purpose === 'Training' && booking.status === 'Upcoming') {
                    return { ...booking, isChecklistComplete: true };
                }
                return booking;
            })
        )
    }
  };
  
  const handleReset = (checklistId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          return {
            ...c,
            items: c.items.map(item => ({ ...item, completed: false })),
          };
        }
        return c;
      })
    );
  };
  
  const getStatusVariant = (status: Aircraft['status']) => {
    switch (status) {
      case 'Available':
        return 'success';
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
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Aircraft
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Aircraft</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to add a new aircraft to the fleet.
                        </DialogDescription>
                    </DialogHeader>
                    <NewAircraftForm />
                </DialogContent>
            </Dialog>
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
                  <TableHead className="text-right">Checklists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraftData.map((aircraft) => {
                  const preFlightChecklist = checklists.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraft.id);
                  return (
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
                    <TableCell className="text-right">
                       <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <ClipboardCheck className="h-4 w-4" />
                                    <span className="sr-only">Open checklists</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Available Checklists</DropdownMenuLabel>
                                {preFlightChecklist && (
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem>
                                        {preFlightChecklist.title}
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {preFlightChecklist && (
                            <DialogContent className="sm:max-w-md">
                                <ChecklistCard 
                                    checklist={preFlightChecklist} 
                                    onUpdate={handleChecklistUpdate}
                                    onReset={handleReset}
                                />
                            </DialogContent>
                        )}
                       </Dialog>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
