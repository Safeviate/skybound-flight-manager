
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
      {/* Timeline grid will be built here */}
      <div
        className="grid"
        style={{
          gridTemplateRows: `repeat(${aircraft.length}, 60px)`,
        }}
      >
        {aircraft.map((ac, index) => (
          <div key={ac.id} className="border-b">
            {/* A single aircraft row */}
            <div className="h-full w-full bg-blue-500/10"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
