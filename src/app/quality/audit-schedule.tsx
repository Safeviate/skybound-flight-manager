
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils.tsx';
import type { AuditScheduleItem, AuditStatus } from '@/lib/types';
import { Edit, PlusCircle, Save, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const STATUS_OPTIONS: AuditStatus[] = ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'];
const YEAR = new Date().getFullYear();

interface AuditScheduleProps {
  auditAreas: string[];
  schedule: AuditScheduleItem[];
  onUpdate: (item: AuditScheduleItem) => void;
  onAreaUpdate: (index: number, newName: string) => void;
  onAreaAdd: () => void;
  onAreaDelete: (index: number) => void;
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
          }}
        >
          {status}
        </Button>
      ))}
    </div>
  );
};


export function AuditSchedule({ auditAreas, schedule, onUpdate, onAreaUpdate, onAreaAdd, onAreaDelete }: AuditScheduleProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [tempAreaName, setTempAreaName] = React.useState('');

  const getScheduleItem = (area: string, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): AuditScheduleItem => {
    return schedule.find(item => item.area === area && item.quarter === quarter && item.year === YEAR) 
           || { id: `${area}-${quarter}-${YEAR}`, area, quarter, year: YEAR, status: 'Not Scheduled' };
  };

  const handleStatusChange = (item: AuditScheduleItem, newStatus: AuditStatus) => {
    onUpdate({ ...item, status: newStatus });
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setTempAreaName(auditAreas[index]);
  };

  const handleSaveClick = (index: number) => {
    onAreaUpdate(index, tempAreaName);
    setEditingIndex(null);
  };
  
  const handleCancelClick = () => {
    setEditingIndex(null);
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid bg-muted font-semibold" style={{ gridTemplateColumns: '250px repeat(4, 1fr)' }}>
          <div className="p-3 border-b border-r">Audit Area</div>
          {QUARTERS.map(q => <div key={q} className="p-3 text-center border-b border-r last:border-r-0">{q} {YEAR}</div>)}
        </div>
        <div className="grid grid-cols-1">
          {auditAreas.map((area, index) => (
            <div key={index} className="grid items-stretch" style={{ gridTemplateColumns: '250px repeat(4, 1fr)' }}>
              <div className="p-2 border-b border-r font-medium flex items-center justify-between gap-2">
                {editingIndex === index ? (
                  <Input 
                    value={tempAreaName}
                    onChange={(e) => setTempAreaName(e.target.value)}
                    className="h-8"
                  />
                ) : (
                   <span>{area}</span>
                )}
                <div className="flex items-center">
                    {editingIndex === index ? (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveClick(index)}>
                                <Save className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAreaDelete(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </>
                    ) : (
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(index)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                </div>
              </div>
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
        <div className="p-2 border-t">
            <Button variant="outline" size="sm" onClick={onAreaAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Area
            </Button>
        </div>
      </div>
    </div>
  );
}
