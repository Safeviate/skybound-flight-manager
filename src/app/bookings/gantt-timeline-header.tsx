
'use client';

import React from 'react';

export function GanttTimelineHeader() {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours

  return (
    <div className="flex h-full" style={{ minWidth: '2000px' }}>
      {hours.map(hour => (
        <div key={hour} className="flex-none w-24 text-center p-3 border-r">
          <span className="text-sm font-medium">{`${String(hour).padStart(2, '0')}:00`}</span>
        </div>
      ))}
    </div>
  );
}
