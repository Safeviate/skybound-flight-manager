
'use client';

import React from 'react';
import type { Aircraft } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface GanttAircraftColumnProps {
    aircraft: Aircraft[];
}

export function GanttAircraftColumn({ aircraft }: GanttAircraftColumnProps) {

  const getStatus = (ac: Aircraft): { text: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } => {
    if (ac.status !== 'Available') {
      return { text: ac.status, variant: ac.status === 'In Maintenance' ? 'destructive' : 'secondary' };
    }
    if (ac.checklistStatus === 'needs-post-flight') {
      return { text: 'Needs Post-Flight', variant: 'warning' };
    }
    return { text: 'Available', variant: 'success' };
  };


  return (
    <div className="h-full">
      {aircraft.map(ac => {
        const status = getStatus(ac);
        return (
          <div key={ac.id} className="h-20 border-b flex items-center p-2">
              <div>
                  <p className="font-semibold">{ac.model}</p>
                  <p className="text-sm text-muted-foreground">{ac.tailNumber}</p>
                   <Badge variant={status.variant} className="mt-1">{status.text}</Badge>
              </div>
          </div>
        )
      })}
    </div>
  );
}
