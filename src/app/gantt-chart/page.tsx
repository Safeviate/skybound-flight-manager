
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';


const timeSlots = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = (6 + Math.floor(i / 2)) % 24;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);
const resources = ['Aircraft 1', 'Aircraft 2', 'Instructor A', 'Instructor B', 'Room 1', 'Aircraft 3', 'Aircraft 4', 'Instructor C', 'Instructor D', 'Room 2', 'Aircraft 5', 'Aircraft 6', 'Instructor E', 'Instructor F', 'Room 3'];


const GanttChart = () => {
    return (
        <div className="h-[600px] overflow-auto rounded-lg border">
            <Table className="border-collapse" style={{ tableLayout: 'fixed' }}>
                <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                        <TableHead className="sticky left-0 z-20 bg-card text-center w-[150px] border-r">Resource</TableHead>
                        {hourlyTimeSlots.map(time => (
                            <TableHead key={time} colSpan={2} className="text-center w-[120px] border-l">{time}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {resources.map(resource => (
                        <TableRow key={resource}>
                            <TableCell className="sticky left-0 z-10 bg-card font-medium text-center w-[150px] border-r">{resource}</TableCell>
                            {timeSlots.map(time => (
                                <TableCell key={time} className="w-[60px] border-l"></TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}


function GanttChartPage() {
    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gantt Chart</CardTitle>
                    <CardDescription>A visual representation of schedules and bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GanttChart />
                </CardContent>
            </Card>
        </main>
    );
}

GanttChartPage.title = "Gantt Chart";

export default GanttChartPage;
