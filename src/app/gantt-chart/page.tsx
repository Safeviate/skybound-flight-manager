
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


const timeSlots = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = (6 + Math.floor(i / 2)) % 24;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);
const resources = ['Aircraft 1', 'Aircraft 2', 'Instructor A', 'Instructor B', 'Room 1', 'Aircraft 3', 'Aircraft 4', 'Instructor C', 'Instructor D', 'Room 2', 'Aircraft 5', 'Aircraft 6', 'Instructor E', 'Instructor F', 'Room 3'];

const StickyGanttChart = () => {
    return (
        <div className="relative h-[600px] overflow-auto rounded-md border">
            <Table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
                 <TableHeader>
                    <TableRow>
                        <TableHead 
                            className="sticky left-0 z-20 bg-card w-[150px] border-r"
                        >
                            Resource
                        </TableHead>
                        {hourlyTimeSlots.map(time => (
                            <TableHead key={time} colSpan={2} className="text-center w-[120px] border-l">{time}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {resources.map(resource => (
                        <TableRow key={resource}>
                            <TableCell className="sticky left-0 z-10 bg-card font-medium w-[150px] border-r">{resource}</TableCell>
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

const SplitTableGanttChart = () => {
    const resourceColumnRef = React.useRef<HTMLDivElement>(null);
    const dataAreaRef = React.useRef<HTMLDivElement>(null);

    const syncScroll = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
        if (target && source) {
            target.scrollTop = source.scrollTop;
        }
    };

    return (
        <div className="grid grid-cols-[150px_1fr] h-[600px] border rounded-lg overflow-hidden">
            {/* Resource Column */}
            <div 
                ref={resourceColumnRef} 
                className="overflow-y-hidden"
                onScroll={(e) => syncScroll(e.currentTarget, dataAreaRef.current)}
            >
                 <Table className="h-full">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="h-[57px]">
                            <TableHead className="text-center">Resource</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resources.map(resource => (
                            <TableRow key={resource} className="h-[41px]">
                                <TableCell className="font-medium text-center">{resource}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            {/* Data Area */}
            <div 
                ref={dataAreaRef} 
                className="overflow-auto" 
                onScroll={(e) => syncScroll(e.currentTarget, resourceColumnRef.current)}
            >
                <Table className="border-collapse" style={{ tableLayout: 'fixed', width: '2400px' }}>
                     <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="h-[57px]">
                            {hourlyTimeSlots.map(time => (
                                <TableHead key={time} colSpan={2} className="text-center w-[120px] border-l">{time}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resources.map(resource => (
                            <TableRow key={resource} className="h-[41px]">
                                {timeSlots.map(time => (
                                    <TableCell key={time} className="w-[60px] border-l"></TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}


function GanttChartPage() {
    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gantt Chart</CardTitle>
                    <CardDescription>A visual representation of schedules and bookings using different implementation techniques.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="split">
                        <TabsList>
                            <TabsTrigger value="sticky">CSS Sticky Approach</TabsTrigger>
                            <TabsTrigger value="split">Split Table Approach</TabsTrigger>
                        </TabsList>
                        <TabsContent value="sticky" className="mt-4">
                            <p className="text-sm text-muted-foreground mb-2">This version uses `position: sticky` in CSS to keep the header and first column fixed.</p>
                            <StickyGanttChart />
                        </TabsContent>
                        <TabsContent value="split" className="mt-4">
                             <p className="text-sm text-muted-foreground mb-2">This version uses two separate tables and synchronizes their scrolling with JavaScript.</p>
                            <SplitTableGanttChart />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}

GanttChartPage.title = "Gantt Chart";

export default GanttChartPage;



