

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
import { ClipboardCheck, PlusCircle, QrCode, Printer } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { aircraftData, bookingData as initialBookingData, checklistData as initialChecklistData } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCard } from '../checklists/checklist-card';
import QRCode from 'qrcode.react';
import Link from 'next/link';


export default function AircraftPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklistData);
  const [bookings, setBookings] = useState<Booking[]>(initialBookingData);
  const [fleet, setFleet] = useState<Aircraft[]>(aircraftData);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

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
        // Find the completed booking this checklist belongs to.
        // In a real app this link would be more direct.
        const relatedBooking = bookings.find(b => b.aircraft === aircraft.tailNumber && b.status === 'Approved' && b.isChecklistComplete);

        if(relatedBooking) {
            setBookings(prevBookings => 
                prevBookings.map(booking => 
                    booking.id === relatedBooking.id ? { ...booking, isPostFlightChecklistComplete: true } : booking
                )
            );
        }

        // Mark the aircraft as ready for the next flight
        setFleet(prevFleet =>
            prevFleet.map(ac => 
                ac.id === aircraft.id ? { ...ac, isPostFlightPending: false } : ac
            )
        );
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
  
  const handleGenerateQrCode = (aircraftId: string) => {
    if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        const checklistPath = `/checklists/start/${aircraftId}`;
        const loginUrl = new URL('/login', currentUrl.origin);
        loginUrl.searchParams.set('redirect', checklistPath);
        setQrCodeUrl(loginUrl.toString());
    }
  };

  const handlePrint = (aircraftId: string) => {
    const qrCodeDialogContent = document.getElementById(`qr-code-dialog-content-${aircraftId}`);
    if (qrCodeDialogContent) {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print QR Code</title>');
            printWindow.document.write(`
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .print-container { text-align: center; }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write('<div class="print-container">');
            printWindow.document.write(qrCodeDialogContent.innerHTML);
            printWindow.document.write('</div>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
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
                  <TableHead>Airworthiness Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead className="text-right">Checklists</TableHead>
                  <TableHead className="text-right no-print">QR Code</TableHead>
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
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right no-print">
                        <Dialog onOpenChange={(open) => open && handleGenerateQrCode(aircraft.id)}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <QrCode className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xs">
                                <div id={`qr-code-dialog-content-${aircraft.id}`}>
                                    <DialogHeader>
                                        <DialogTitle className="text-center">{aircraft.model} ({aircraft.tailNumber})</DialogTitle>
                                        <DialogDescription className="text-center">
                                            Scan to start checklist.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="p-4 flex justify-center">
                                        {qrCodeUrl && <QRCode value={qrCodeUrl} size={200} renderAs="svg" />}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => handlePrint(aircraft.id)}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print QR Code
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
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

    