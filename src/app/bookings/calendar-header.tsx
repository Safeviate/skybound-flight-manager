
'use client';

import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type CalendarViewMode = 'month' | 'week' | 'day' | 'gantt';

interface CalendarHeaderProps {
  currentDate: Date;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  view: CalendarViewMode;
  setView: Dispatch<SetStateAction<CalendarViewMode>>;
}

export function CalendarHeader({ currentDate, setCurrentDate, view, setView }: CalendarHeaderProps) {
  
  const handlePrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'day' || view === 'gantt') setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day' || view === 'gantt') setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateFormat = () => {
    switch (view) {
      case 'month':
        return 'MMMM yyyy';
      case 'week':
        return `MMMM yyyy`; // Week view will show range in its own component
      case 'day':
      case 'gantt':
        return 'MMMM d, yyyy';
    }
  };

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
         <h2 className="text-lg font-semibold ml-4">{format(currentDate, getDateFormat())}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setView('month')}>
          Month
        </Button>
        <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>
          Week
        </Button>
        <Button variant={view === 'day' ? 'default' : 'outline'} size="sm" onClick={() => setView('day')}>
          Day
        </Button>
         <Button variant={view === 'gantt' ? 'default' : 'outline'} size="sm" onClick={() => setView('gantt')}>
          Gantt
        </Button>
      </div>
    </div>
  );
}
