
'use client';

import React, { useState, useRef, UIEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  addDays,
  subDays,
  format,
} from 'date-fns';
import { GanttAircraftColumn } from './gantt-aircraft-column';
import { GanttTimeline } from './gantt-timeline';
import { GanttTimelineHeader } from './gantt-timeline-header';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date('2024-08-15'));

  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (timelineHeaderRef.current) {
      timelineHeaderRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {format(currentDate, 'PPP')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev Day
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date('2024-08-15'))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            Next Day
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid border rounded-lg" style={{ gridTemplateColumns: '200px 1fr' }}>
        {/* Top-left empty cell */}
        <div className="p-3 font-semibold border-b border-r bg-muted">
          
        </div>
        
        {/* Top-right timeline header */}
        <div ref={timelineHeaderRef} className="overflow-x-hidden border-b">
            <GanttTimelineHeader />
        </div>

        {/* Bottom-left aircraft column */}
        <div className="border-r">
          <GanttAircraftColumn />
        </div>

        {/* Bottom-right timeline body */}
        <div ref={timelineBodyRef} className="overflow-x-auto" onScroll={handleScroll}>
          <GanttTimeline currentDate={currentDate} />
        </div>
      </div>
    </div>
  );
}
