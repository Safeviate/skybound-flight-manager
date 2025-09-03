
'use client';

import { useState, useMemo } from 'react';
import type { Booking, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTableControls } from '@/hooks/use-table-controls';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FlightLogsPageContentProps {
  initialBookings: Booking[];
  initialUsers: User[];
}

export function FlightLogsPageContent({ initialBookings, initialUsers }: FlightLogsPageContentProps) {
  const { items, searchTerm, setSearchTerm, requestSort, sortConfig } = useTableControls(initialBookings, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['bookingNumber', 'aircraft', 'student', 'instructor'],
  });

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text("Flight Log History", 14, 15);

    const tableBody = items.map(log => [
        log.bookingNumber || 'N/A',
        format(parseISO(log.date), 'dd/MM/yyyy'),
        log.aircraft,
        log.student || 'N/A',
        log.instructor || 'N/A',
        log.flightDuration?.toFixed(1) || '0.0',
    ]);
    
    autoTable(doc, {
        startY: 25,
        head: [['Booking #', 'Date', 'Aircraft', 'Student/Pilot', 'Instructor', 'Duration (hrs)']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save('flight_logs.pdf');
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof Booking }) => (
    <Button variant="ghost" onClick={() => requestSort(sortKey)}>
        {label}
        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig?.key === sortKey ? '' : 'opacity-0 group-hover:opacity-50'}`} />
    </Button>
  );

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Flight Logs</CardTitle>
          <CardDescription>A complete history of all completed flights.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Button variant="outline" onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download as PDF
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortableHeader label="Booking #" sortKey="bookingNumber" /></TableHead>
                <TableHead><SortableHeader label="Date" sortKey="date" /></TableHead>
                <TableHead><SortableHeader label="Aircraft" sortKey="aircraft" /></TableHead>
                <TableHead><SortableHeader label="Student/Pilot" sortKey="student" /></TableHead>
                <TableHead><SortableHeader label="Instructor" sortKey="instructor" /></TableHead>
                <TableHead><SortableHeader label="Duration (hrs)" sortKey="flightDuration" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.bookingNumber || 'N/A'}</TableCell>
                    <TableCell>{format(parseISO(log.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{log.aircraft}</TableCell>
                    <TableCell>{log.student || 'N/A'}</TableCell>
                    <TableCell>{log.instructor || 'N/A'}</TableCell>
                    <TableCell>{log.flightDuration?.toFixed(1) || '0.0'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No completed flight logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
