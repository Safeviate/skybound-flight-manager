
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function GanttChartPage() {
    const timeSlots = Array.from({ length: 24 * 2 }, (_, i) => {
        const hour = (6 + Math.floor(i / 2)) % 24;
        const minute = (i % 2) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    });
    const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gantt Chart</CardTitle>
                    <CardDescription>A visual representation of schedules and bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="gantt">
                        <TabsList>
                            <TabsTrigger value="gantt">Gantt View</TabsTrigger>
                            <TabsTrigger value="calendar" disabled>Calendar View (Coming Soon)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="gantt" className="mt-4">
                            <ScrollArea className="rounded-md border h-[600px] w-full">
                                <div className="relative" style={{ width: '2500px' }}>
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-card">
                                            <TableRow>
                                                <TableHead className="sticky left-0 z-20 bg-card w-[150px]">Resource</TableHead>
                                                {hourlyTimeSlots.map(time => (
                                                    <TableHead key={time} colSpan={2} className="text-center w-[120px]">{time}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {['Aircraft 1', 'Aircraft 2', 'Instructor A', 'Instructor B', 'Room 1', 'Aircraft 3', 'Aircraft 4', 'Instructor C', 'Instructor D', 'Room 2', 'Aircraft 5', 'Aircraft 6', 'Instructor E', 'Instructor F', 'Room 3'].map(resource => (
                                                <TableRow key={resource}>
                                                    <TableCell className="sticky left-0 z-10 bg-card font-medium w-[150px]">{resource}</TableCell>
                                                    {timeSlots.map(time => (
                                                        <TableCell key={time} className="w-[60px] border-l"></TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}

GanttChartPage.title = "Gantt Chart";

export default GanttChartPage;
