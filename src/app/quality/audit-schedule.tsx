
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils.tsx';
import type { AuditScheduleItem, AuditStatus } from '@/lib/types';
import { Check, ChevronsUpDown } from 'lucide-react';

const AUDIT_AREAS = ['Flight Operations', 'Maintenance', 'Ground Ops', 'Management', 'Safety Systems', 'External (FAA)'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const STATUS_OPTIONS: AuditStatus[] = ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'];
const YEAR = new Date().getFullYear();

interface AuditScheduleProps {
  schedule: AuditScheduleItem[];
  onUpdate: (item: AuditScheduleItem) => void;
}

const getStatusBadgeVariant = (status: AuditStatus) => {
    switch (status) {
        case 'Completed': return 'success';
        case 'Scheduled': return 'primary';
        case 'Pending': return 'warning';
        default: return 'outline';
    }
};

const StatusSelector = ({ 
  currentStatus, 
  onSelect 
}: { 
  currentStatus: AuditStatus, 
  onSelect: (status: AuditStatus) => void 
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="p-4 space-y-2">
      <p className="text-sm font-medium">Set Audit Status</p>
      {STATUS_OPTIONS.map(status => (
        <Button
          key={status}
          variant={currentStatus === status ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onSelect(status);
            setOpen(false);
          }}
        >
          {status}
        </Button>
      ))}
    </div>
  );
};


export function AuditSchedule({ schedule, onUpdate }: AuditScheduleProps) {
  const getScheduleItem = (area: string, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): AuditScheduleItem => {
    return schedule.find(item => item.area === area && item.quarter === quarter && item.year === YEAR) 
           || { id: `${area}-${quarter}-${YEAR}`, area, quarter, year: YEAR, status: 'Not Scheduled' };
  };

  const handleStatusChange = (item: AuditScheduleItem, newStatus: AuditStatus) => {
    onUpdate({ ...item, status: newStatus });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-5 bg-muted font-semibold">
        <div className="p-3 border-b border-r">Audit Area</div>
        {QUARTERS.map(q => <div key={q} className="p-3 text-center border-b border-r last:border-r-0">{q} {YEAR}</div>)}
      </div>
      <div className="grid grid-cols-1">
        {AUDIT_AREAS.map(area => (
          <div key={area} className="grid grid-cols-5 items-stretch">
            <div className="p-3 border-b border-r font-medium flex items-center">{area}</div>
            {QUARTERS.map(quarter => {
              const item = getScheduleItem(area, quarter);
              return (
                <Popover key={quarter}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "p-3 text-center border-b border-r last:border-r-0 hover:bg-muted/50 cursor-pointer flex items-center justify-center",
                      item.status !== 'Not Scheduled' && 'bg-muted/30'
                    )}>
                      {item.status !== 'Not Scheduled' ? (
                        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Click to schedule</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <StatusSelector 
                      currentStatus={item.status}
                      onSelect={(newStatus) => handleStatusChange(item, newStatus)}
                    />
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
