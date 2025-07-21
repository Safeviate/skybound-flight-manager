
'use client';

import React from 'react';

export function GanttTimeline() {
  // This will be populated with booking data later.
  return (
    <div className="relative" style={{ minWidth: '2000px' }}>
      {/* Placeholder for grid lines */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-24 border-r"></div>
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
