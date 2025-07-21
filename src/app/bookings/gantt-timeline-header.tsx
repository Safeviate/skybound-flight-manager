'use client';

import React from 'react';

const HOURS_IN_DAY = 24;
const HOUR_COLUMN_WIDTH_PX = 96; // Corresponds to w-24 in Tailwind (24 * 4px)
const TOTAL_WIDTH_PX = HOURS_IN_DAY * HOUR_COLUMN_WIDTH_PX;


export function GanttTimelineHeader() {
  const hours = Array.from({ length: HOURS_IN_DAY }, (_, i) => i); // 0-23 hours

  return (
    <div className="flex h-full" style={{ minWidth: `${TOTAL_WIDTH_PX}px` }}>
      {hours.map(hour => (
        <div key={hour} className="flex-none text-center p-3 border-r" style={{ width: `${HOUR_COLUMN_WIDTH_PX}px` }}>
          <span className="text-sm font-medium">{`${String(hour).padStart(2, '0')}:00`}</span>
        </div>
      ))}
    </div>
  );
}
