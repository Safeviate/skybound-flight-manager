
'use client';

import React from 'react';

interface GanttHeaderProps {
  startTime: number;
  endTime: number;
}

export function GanttHeader({ startTime, endTime }: GanttHeaderProps) {
  const hours = Array.from({ length: endTime - startTime }, (_, i) => startTime + i);

  return (
    <>
      {hours.map(hour => (
        <div key={hour} className="sticky top-0 z-10 p-2 text-center text-sm font-medium text-muted-foreground bg-muted border-b border-r">
          {`${hour.toString().padStart(2, '0')}:00`}
        </div>
      ))}
    </>
  );
}
