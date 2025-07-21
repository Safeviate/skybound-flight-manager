
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
    <div className="relative">
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
          </div>
        ))}
      </div>
    </div>
  );
}
