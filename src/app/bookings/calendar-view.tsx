
'use client';

import React, { useState } from 'react';
import type { Aircraft, Booking } from '@/lib/types';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { CalendarHeader } from './calendar-header';
import { startOfToday } from 'date-fns';
import { GanttChartView } from './gantt-chart-view';

type CalendarViewMode = 'month' | 'week' | 'day' | 'gantt';

interface CalendarViewProps {
  bookings: Booking[];
  aircraft: Aircraft[];
}

export function CalendarView({ bookings, aircraft }: CalendarViewProps) {
  const [view, setView] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(startOfToday());

  return (
    <div className="flex h-[calc(100vh-250px)] flex-col">
       <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
      />
      <div className="flex-1 overflow-auto">
        {view === 'month' && <MonthView currentDate={currentDate} bookings={bookings} />}
        {view === 'week' && <WeekView currentDate={currentDate} bookings={bookings} />}
        {view === 'day' && <DayView currentDate={currentDate} bookings={bookings} />}
        {view === 'gantt' && <GanttChartView currentDate={currentDate} bookings={bookings} aircraft={aircraft}/>}
      </div>
    </div>
  );
}
