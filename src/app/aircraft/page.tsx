
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
import { ClipboardCheck, PlusCircle, QrCode, Printer } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { aircraftData, bookingData as initialBookingData, checklistData as initialChecklistData } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCard } from '../checklists/checklist-card';
import QRCode from 'qrcode.react';


export default function AircraftPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklistData);
  const [bookings, setBookings] = useState<Booking[]>(initialBookingData);

  const handleItemToggle = (toggledChecklist: Checklist) => {
    setChecklists(prevChecklists =>
        prevChecklists.map(c => (c.id === toggledChecklist.id ? toggledChecklist : c))
    );
  };

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    handleItemToggle(updatedChecklist); // Ensure final state is up to date

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
  
  const getQRCodeUrl = (aircraftId: string) => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/checklists/start/${aircraftId}`;
    }
    return '';
  };

  const handlePrint = () => {
    const printContents = document.getElementById('qr-code-dialog')?.innerHTML;
    if (printContents) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write('<html><head><title>Print QR Code</title>');
        // Optional: Add some basic styling for printing
        doc.write('<style>body { text-align: center; font-family: sans-serif; } canvas { width: 200px !important; height: 200px !important; } </style>');
        doc.write('</head><body>');
        doc.write(printContents);
        doc.write('</body></html>');
        doc.close();
        
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }

      // Clean up the iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
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
                  <TableHead className="text-right">QR Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraftData.map((aircraft) => {
                  const preFlightChecklist = checklists.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraft.id);
                  const qrUrl = getQRCodeUrl(aircraft.id);
                  return (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                    <TableCell>{aircraft.model}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>
                    </TableCell>
                    <TableCell>{aircraft.hours.toFixed(1)}</TableCell>
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
                        )}
                       </Dialog>
                    </TableCell>
                    <TableCell className="text-right">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <QrCode className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xs">
                                <div id="qr-code-dialog">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">{aircraft.model} ({aircraft.tailNumber})</DialogTitle>
                                        <DialogDescription className="text-center">
                                            Scan to start pre-flight checklist.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="p-4 flex justify-center">
                                        {qrUrl && <QRCode value={qrUrl} size={200} />}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handlePrint}>
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
}
