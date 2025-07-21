
'use client';

import React from 'react';
import type { Aircraft, Booking } from '@/lib/types';

interface GanttTimelineProps {
  date: Date;
  bookings: Booking[];
  aircraft: Aircraft[];
}

export function GanttTimeline({ date, bookings, aircraft }: GanttTimelineProps) {
  return (
    <div className="relative min-w-[2000px]">
      <div
        className="grid"
        style={{
          gridTemplateRows: `repeat(1, 60px)`, // Only one row now
        }}
      >
        <div className="border-b relative">
            {/* Horizontal grid lines for each hour */}
            {Array.from({ length: 24 }).map((_, hour) => (
                <div 
                    key={hour}
                    className="absolute top-0 h-full border-r"
                    style={{ left: `${hour * 80}px`, width: '80px' }}
                ></div>
            ))}
        </div>
      </div>
    </div>
  );
}
