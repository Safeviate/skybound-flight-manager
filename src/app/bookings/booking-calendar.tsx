
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  addDays,
  subDays,
  format,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aircraftData } from '@/lib/mock-data';
import type { Booking } from '@/lib/types';
import { GanttAircraftColumn } from './gantt-aircraft-column';
import { GanttTimeline } from './gantt-timeline';

interface BookingCalendarProps {
  bookings: Booking[];
}

export function BookingCalendar({ bookings }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date('2024-08-15'));

  const handlePreviousDay = () => {
    setCurrentDate(subDays(currentDate, 1));
  };

  const handleNextDay = () => {
    setCurrentDate(addDays(currentDate, 1));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date('2024-08-15'));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center gap-1 rounded-md border p-1">
             <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-lg font-semibold">
            {format(currentDate, 'MMMM d, yyyy')}
        </div>
        <div>{/* Placeholder for future controls */}</div>
      </div>
      
      <div className="border rounded-lg">
        <div className="grid grid-cols-[200px_1fr]">
            <div className="p-2 border-b border-r">
              <h3 className="font-semibold text-center">Aircraft</h3>
            </div>
            <div className="p-2 border-b overflow-x-auto">
              {/* This will hold the timeline header */}
            </div>
            <GanttAircraftColumn aircraft={aircraftData} />
            <div className="overflow-x-auto">
                <GanttTimeline date={currentDate} bookings={bookings} aircraft={aircraftData} />
            </div>
        </div>
      </div>
    </div>
  );
}
