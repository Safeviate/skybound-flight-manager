
'use client';

import React from 'react';
import { aircraftData } from '@/lib/mock-data';

export function GanttAircraftColumn() {
  return (
    <div className="h-full">
      {aircraftData.map(aircraft => (
        <div key={aircraft.id} className="h-20 border-b flex items-center p-2">
            <div>
                <p className="font-semibold">{aircraft.model}</p>
                <p className="text-sm text-muted-foreground">{aircraft.tailNumber}</p>
            </div>
        </div>
      ))}
    </div>
  );
}
