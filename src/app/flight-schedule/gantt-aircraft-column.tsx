
'use client';

import React from 'react';
import type { Aircraft } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GanttAircraftColumnProps {
  aircraft: Aircraft;
  isOdd: boolean;
}

export function GanttAircraftColumn({ aircraft, isOdd }: GanttAircraftColumnProps) {
  const getStatusVariant = (status: Aircraft['status']) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Booked': return 'warning';
      case 'In Maintenance': return 'destructive';
      default: return 'outline';
    }
  };

  const renderStatusBadge = () => {
    if (aircraft.status === 'Available') {
        return null;
    }
    return <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>;
  }

  return (
    <div className={cn(
        "sticky left-0 z-10 flex flex-col justify-center p-2 border-b border-r h-16",
        isOdd ? 'bg-background' : 'bg-muted/50'
    )}>
      <p className="font-semibold text-sm">{aircraft.model}</p>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{aircraft.tailNumber}</p>
        {renderStatusBadge()}
      </div>
    </div>
  );
}
