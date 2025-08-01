
'use client';

import React from 'react';
import type { Booking } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface GanttBookingBarProps {
  booking: Booking;
  ganttStartTime: number;
}

export function GanttBookingBar({ booking, ganttStartTime }: GanttBookingBarProps) {
  const timeToPercentage = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours + minutes / 60);
  };

  const startPercent = (timeToPercentage(booking.startTime) - ganttStartTime) / (22 - ganttStartTime) * 100;
  const endPercent = (timeToPercentage(booking.endTime) - ganttStartTime) / (22 - ganttStartTime) * 100;
  const widthPercent = endPercent - startPercent;

  const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500 hover:bg-blue-600';
      case 'Maintenance': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Private': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute h-12 top-2 rounded-md p-2 text-white text-xs font-medium cursor-pointer overflow-hidden transition-all",
              getBookingColor(booking.purpose)
            )}
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
          >
            <div className="truncate">
                {booking.purpose === 'Training' ? `${booking.student} w/ ${booking.instructor}` : booking.purpose}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{booking.purpose}: {booking.aircraft}</p>
          <p>Time: {booking.startTime} - {booking.endTime}</p>
          {booking.purpose === 'Training' && <p>Student: {booking.student}</p>}
          {booking.purpose === 'Training' && <p>Instructor: {booking.instructor}</p>}
          {booking.trainingExercise && <p>Exercise: {booking.trainingExercise}</p>}
          {booking.maintenanceType && <p>Details: {booking.maintenanceType}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
