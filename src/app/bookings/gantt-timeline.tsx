'use client';

import React from 'react';

const HOURS_IN_DAY = 24;
const HOUR_COLUMN_WIDTH_PX = 96; // Corresponds to w-24 in Tailwind (24 * 4px)
const TOTAL_WIDTH_PX = HOURS_IN_DAY * HOUR_COLUMN_WIDTH_PX;

export function GanttTimeline() {
  // This will be populated with booking data later.
  return (
    <div className="relative" style={{ minWidth: `${TOTAL_WIDTH_PX}px` }}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: HOURS_IN_DAY }).map((_, i) => (
          <div key={i} className="border-r" style={{ width: `${HOUR_COLUMN_WIDTH_PX}px` }}></div>
        ))}
      </div>

      {/* Placeholder for booking rows */}
      <div className="relative">
        <div className="h-20 border-b"></div>
        <div className="h-20 border-b"></div>
        <div className="h-20 border-b"></div>
      </div>
    </div>
  );
}
