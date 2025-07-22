
'use client';

import { useState, useEffect } from 'react';
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
import { ClipboardCheck, PlusCircle, QrCode } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { aircraftData, bookingData as initialBookingData, checklistData as initialChecklistData } from '@/lib/data-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCard } from '../checklists/checklist-card';
import Link from 'next/link';
import QRCode from 'qrcode.react';


export default function AircraftPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklistData);
  const [bookings, setBookings] = useState<Booking[]>(initialBookingData);
  const [fleet, setFleet] = useState<Aircraft[]>(aircraftData);

  const handleItemToggle = (toggledChecklist: Checklist) => {
    setChecklists(prevChecklists =>
        prevChecklists.map(c => (c.id === toggledChecklist.id ? toggledChecklist : c))
    );
  };

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    handleItemToggle(updatedChecklist); // Ensure final state is up to date

    const isComplete = updatedChecklist.items.every(item => item.completed);
    if (!isComplete || !updatedChecklist.aircraftId) return;
    
    const aircraft = fleet.find(ac => ac.id === updatedChecklist.aircraftId);
    if (!aircraft) return;

    if (updatedChecklist.category === 'Pre-Flight') {
         setBookings(prevBookings => 
            prevBookings.map(booking => {
                if (booking.aircraft === aircraft.tailNumber && booking.status === 'Approved') {
                    return { ...booking, isChecklistComplete: true };
                }
                return booking;
            })
        )
    }

    if (updatedChecklist.category === 'Post-Flight') {
        const relatedBooking = bookings.find(b => b.aircraft === aircraft.tailNumber && b.status === 'Approved' && b.isChecklistComplete);

        if(relatedBooking) {
            setBookings(prevBookings => 
                prevBookings.map(booking => 
                    booking.id === relatedBooking.id ? { ...booking, status: 'Completed', isPostFlightChecklistComplete: true } : booking
                )
            );

            const startTime = relatedBooking.startTime.split(':').map(Number);
            const endTime = relatedBooking.endTime.split(':').map(Number);
            const durationHours = (endTime[0] * 60 + endTime[1] - (startTime[0] * 60 + startTime[1])) / 60;
            
            if (durationHours > 0) {
                 setFleet(prevFleet =>
                    prevFleet.map(ac => 
                        ac.id === aircraft.id ? { ...ac, hours: ac.hours + durationHours, isPostFlightPending: false } : ac
                    )
                );
            } else {
                 setFleet(prevFleet =>
                    prevFleet.map(ac => 
                        ac.id === aircraft.id ? { ...ac, isPostFlightPending: false } : ac
                    )
                );
            }
        } else {
             setFleet(prevFleet =>
                prevFleet.map(ac => 
                    ac.id === aircraft.id ? { ...ac, isPostFlightPending: false } : ac
                )
            );
        }
    }
  };
  
  const handleReset = (checklistId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          const originalTemplate = checklistData.find(template => template.id === c.id);
          if (originalTemplate) {
            return {
                ...originalTemplate,
                items: originalTemplate.items.map(item => ({ ...item, completed: false })),
            };
          }
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
                  <TableHead>Hobbs Hours</TableHead>
                  <TableHead>Airworthiness Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.map((aircraft) => {
                  const preFlightChecklist = checklists.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraft.id);
                  const postFlightChecklist = checklists.find(c => c.category === 'Post-Flight' && c.aircraftId === aircraft.id);
                  return (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium">
                      <Link href={`/aircraft/${aircraft.id}`} className="hover:underline">
                        {aircraft.tailNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{aircraft.model}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>
                    </TableCell>
                    <TableCell>{aircraft.hours.toFixed(1)}</TableCell>
                    <TableCell>{getExpiryBadge(aircraft.airworthinessExpiry)}</TableCell>
                    <TableCell>{getExpiryBadge(aircraft.insuranceExpiry)}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <QrCode className="h-4 w-4" />
                                        <span className="sr-only">Show QR Code</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xs">
                                <DialogHeader>
                                    <DialogTitle>Checklist for {aircraft.tailNumber}</DialogTitle>
                                    <DialogDescription>
                                        Scan this code with the in-app scanner to start the pre-flight checklist.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex items-center justify-center p-4">
                                    <QRCode value={aircraft.id} size={200} />
                                </div>
                                </DialogContent>
                            </Dialog>
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
                                    <Dialog>
                                        <DialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            {preFlightChecklist.title}
                                        </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
                                        <ChecklistCard 
                                            checklist={preFlightChecklist}
                                            aircraft={aircraft}
                                            onItemToggle={handleItemToggle}
                                            onUpdate={handleChecklistUpdate}
                                            onReset={handleReset}
                                            onEdit={() => {}}
                                        />
                                        </DialogContent>
                                    </Dialog>
                                    )}
                                    {postFlightChecklist && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            {postFlightChecklist.title}
                                        </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
                                        <ChecklistCard 
                                            checklist={postFlightChecklist}
                                            aircraft={aircraft}
                                            onItemToggle={handleItemToggle}
                                            onUpdate={handleChecklistUpdate}
                                            onReset={handleReset}
                                            onEdit={() => {}}
                                        />
                                        </DialogContent>
                                    </Dialog>
                                    )}
                                    {!preFlightChecklist && !postFlightChecklist && (
                                        <DropdownMenuItem disabled>No checklists assigned</DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
