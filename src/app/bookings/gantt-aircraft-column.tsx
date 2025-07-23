
'use client';

import React from 'react';
import type { Aircraft } from '@/lib/types';

interface GanttAircraftColumnProps {
    aircraft: Aircraft[];
}

export function GanttAircraftColumn({ aircraft }: GanttAircraftColumnProps) {
  return (
    <div className="h-full">
      {aircraft.map(ac => (
        <div key={ac.id} className="h-20 border-b flex items-center p-2">
            <div>
                <p className="font-semibold">{ac.model}</p>
                <p className="text-sm text-muted-foreground">{ac.tailNumber}</p>
            </div>
        </div>
      ))}
    </div>
  );
}
