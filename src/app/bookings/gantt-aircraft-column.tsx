
'use client';

import { aircraftData } from '@/lib/mock-data';

export const rowHeight = 96; // 6rem

export function GanttAircraftColumn() {
    return (
        <div className="flex flex-col">
            {aircraftData.map(aircraft => (
                <div 
                    key={aircraft.id} 
                    className="p-2 font-medium text-sm flex items-center border-b"
                    style={{ height: `${rowHeight}px` }}
                >
                    {aircraft.tailNumber}
                </div>
            ))}
        </div>
    );
}
