
'use client';

import React from 'react';
import type { Aircraft, Booking } from '@/lib/types';
import { GanttHeader } from './gantt-header';
import { GanttAircraftColumn } from './gantt-aircraft-column';
import { GanttBookingBar } from './gantt-booking-bar';
import { Button } from '@/components/ui/button';

interface GanttChartProps {
  aircraft: Aircraft[];
  bookings: Booking[];
  date: Date;
  onCellClick: (aircraft: Aircraft, time: string) => void;
}

export function GanttChart({ aircraft, bookings, date, onCellClick }: GanttChartProps) {
  const ganttStartTime = 6; // 6 AM
  const ganttEndTime = 22; // 10 PM
  const totalHours = ganttEndTime - ganttStartTime;

  return (
    <div className="relative overflow-x-auto border rounded-lg">
      <div className="grid min-w-[1800px]" style={{ gridTemplateColumns: `200px repeat(${totalHours}, 1fr)` }}>
        {/* Corner */}
        <div className="sticky left-0 z-10 p-2 font-semibold bg-muted border-b border-r">Aircraft</div>
        
        {/* Header */}
        <GanttHeader startTime={ganttStartTime} endTime={ganttEndTime} />
        
        {/* Aircraft Rows */}
        {aircraft.map((ac, index) => (
          <React.Fragment key={ac.id}>
            <GanttAircraftColumn aircraft={ac} isOdd={index % 2 !== 0} />
            
            {/* Timeline Row */}
            <div className={`col-start-2 col-span-full grid grid-cols-subgrid relative ${index % 2 !== 0 ? 'bg-background' : 'bg-muted/50'}`}>
                {Array.from({ length: totalHours }).map((_, i) => {
                    const hour = ganttStartTime + i;
                    const timeString = `${hour.toString().padStart(2, '0')}:00`;
                    return (
                        <div key={i} className="h-16 border-r last:border-r-0 flex items-center justify-center">
                            <Button 
                                variant="ghost" 
                                className="h-full w-full"
                                onClick={() => onCellClick(ac, timeString)}
                            />
                        </div>
                    )
                })}

                {/* Bookings for this aircraft */}
                {bookings.filter(b => b.aircraft === ac.tailNumber).map(booking => (
                    <GanttBookingBar key={booking.id} booking={booking} ganttStartTime={ganttStartTime} />
                ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
