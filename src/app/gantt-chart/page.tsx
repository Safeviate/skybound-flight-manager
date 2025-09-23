
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const StickyGanttChart = () => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300; // Amount to scroll in pixels
            const currentScrollLeft = scrollContainerRef.current.scrollLeft;
            
            const newScrollLeft = direction === 'left' 
                ? currentScrollLeft - scrollAmount
                : currentScrollLeft + scrollAmount;
            
            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => handleScroll('left')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleScroll('right')}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div ref={scrollContainerRef} className="relative h-[600px] overflow-auto rounded-md border">
                <Table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-20 bg-card w-[150px] border-r">
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
                className="overflow-y-hidden pr-[17px]" // Compensate for scrollbar width
                onScroll={(e) => syncScroll(e.currentTarget, dataAreaRef.current)}
            >
                 <Table style={{ tableLayout: 'fixed' }}>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow style={{ height: '57px' }}>
                            <TableHead className="text-center">Resource</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resources.map(resource => (
                            <TableRow key={resource} style={{ height: '41px' }}>
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
                <Table className="border-collapse" style={{ tableLayout: 'fixed', width: '2880px' }}>
                     <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow style={{ height: '57px' }}>
                            {hourlyTimeSlots.map(time => (
                                <TableHead key={time} colSpan={2} className="text-center w-[120px] border-l">{time}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resources.map(resource => (
                            <TableRow key={resource} style={{ height: '41px' }}>
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
                    <Tabs defaultValue="sticky">
                        <TabsList>
                            <TabsTrigger value="sticky">CSS Sticky Approach</TabsTrigger>
                            <TabsTrigger value="split">Split Table Approach</TabsTrigger>
                        </TabsList>
                        <TabsContent value="sticky" className="mt-4">
                            <p className="text-sm text-muted-foreground mb-4">This version uses `position: sticky` in CSS to keep the header and first column fixed. Use the buttons to scroll horizontally.</p>
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
