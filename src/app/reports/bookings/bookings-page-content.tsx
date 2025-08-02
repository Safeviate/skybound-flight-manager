
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTableControls } from '@/hooks/use-table-controls';
import type { Booking } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Search, ArrowUpDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function BookingsPageContent({ initialBookings }: { initialBookings: Booking[] }) {
    const {
        items: bookings,
        searchTerm,
        setSearchTerm,
        sortConfig,
        requestSort,
    } = useTableControls<Booking>(initialBookings, {
        initialSort: { key: 'date', direction: 'desc' },
        searchKeys: ['aircraft', 'purpose', 'status', 'student', 'instructor', 'bookingNumber'],
    });

    const getStatusVariant = (status: Booking['status']) => {
        switch (status) {
            case 'Approved': return 'primary';
            case 'Completed': return 'success';
            case 'Cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const SortableHeader = ({ label, sortKey }: { label: string; sortKey: keyof Booking }) => (
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
            {label}
            {sortConfig?.key === sortKey ? (
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? '' : 'rotate-180'}`} />
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />
            )}
        </Button>
    );

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Bookings Log</CardTitle>
                        <CardDescription>A comprehensive record of all flight and maintenance bookings.</CardDescription>
                    </div>
                     <Button asChild variant="outline">
                        <Link href="/reports">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Statistics
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><SortableHeader label="Date" sortKey="date" /></TableHead>
                                <TableHead><SortableHeader label="Booking #" sortKey="bookingNumber" /></TableHead>
                                <TableHead><SortableHeader label="Aircraft" sortKey="aircraft" /></TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead><SortableHeader label="Purpose" sortKey="purpose" /></TableHead>
                                <TableHead>Personnel</TableHead>
                                <TableHead><SortableHeader label="Status" sortKey="status" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell>{format(parseISO(booking.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>{booking.bookingNumber}</TableCell>
                                    <TableCell className="font-medium">{booking.aircraft}</TableCell>
                                    <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                                    <TableCell>{booking.purpose}</TableCell>
                                    <TableCell>
                                        {booking.purpose === 'Training' && `Student: ${booking.student}, Instructor: ${booking.instructor}`}
                                        {booking.purpose === 'Private' && `Pilot: ${booking.student}`}
                                        {booking.purpose === 'Maintenance' && `Note: ${booking.maintenanceType}`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {bookings.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            No bookings found.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
