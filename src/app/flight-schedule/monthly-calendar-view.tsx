
'use client';

import * as React from 'react';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function MonthlyCalendarView({ bookings }: { bookings: Booking[] }) {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (offset: number) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="border bg-muted/50 rounded-md"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = bookings.filter(b => b.date === dayString);

            days.push(
                <div key={day} className="border p-2 h-32 flex flex-col rounded-md">
                    <div className="font-bold text-sm text-right">{day}</div>
                    <div className="flex-grow overflow-y-auto text-xs space-y-1 mt-1 pr-1">
                        {dayEvents.map(event => (
                            <TooltipProvider key={event.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="p-1 rounded bg-primary text-primary-foreground truncate" title={`${event.startTime} - ${event.aircraft}`}>
                                            {event.aircraft} - {event.purpose}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{event.aircraft} ({event.purpose})</p>
                                        <p>{event.startTime} - {event.endTime}</p>
                                        {event.student && <p>Student: {event.student}</p>}
                                        {event.instructor && <p>Instructor: {event.instructor}</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" onClick={() => changeMonth(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous Month
                </Button>
                <h2 className="text-xl font-bold">
                    {currentDate.toLocaleString('default', { month: 'long' })} {year}
                </h2>
                <Button variant="outline" onClick={() => changeMonth(1)}>
                     Next Month <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-sm text-muted-foreground mb-1">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {renderDays()}
            </div>
        </div>
    );
}
