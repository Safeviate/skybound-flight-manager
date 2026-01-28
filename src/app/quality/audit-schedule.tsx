

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils.tsx';
import type { AuditScheduleItem, AuditStatus, CompanyAuditArea } from '@/lib/types';
import { Edit, PlusCircle, Save, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useUser } from '@/context/user-provider';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_OPTIONS: AuditStatus[] = ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'];

interface AuditScheduleProps {
  auditAreas: CompanyAuditArea[];
  schedule: AuditScheduleItem[];
  onUpdate: (item: AuditScheduleItem) => void;
  onAreaUpdate: (areaId: string, newName: string) => void;
  onAreaAdd: () => void;
  onAreaDelete: (areaId: string) => void;
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
  const { company, updateCompany } = useUser();
  const [headers, setHeaders] = React.useState<string[]>(['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4']);
  const [monthHeaders, setMonthHeaders] = React.useState<string[]>(MONTHS);
  const [year, setYear] = React.useState(new Date().getFullYear());
  
  const [editingHeaderIndex, setEditingHeaderIndex] = React.useState<number | null>(null);
  const [tempHeaderText, setTempHeaderText] = React.useState('');
  const [editingMonthHeaderIndex, setEditingMonthHeaderIndex] = React.useState<number | null>(null);
  const [tempMonthHeaderText, setTempMonthHeaderText] = React.useState('');
  const [isYearEditing, setIsYearEditing] = React.useState(false);
  const [tempYear, setTempYear] = React.useState(year.toString());

  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [tempAreaName, setTempAreaName] = React.useState('');
  
  React.useEffect(() => {
    if (company?.auditScheduleHeaders) setHeaders(company.auditScheduleHeaders);
    if (company?.auditScheduleMonthHeaders) setMonthHeaders(company.auditScheduleMonthHeaders);
    if (company?.auditScheduleYear) setYear(company.auditScheduleYear);
  }, [company]);

  const handleHeaderClick = (index: number) => {
    setEditingHeaderIndex(index);
    setTempHeaderText(headers[index]);
  };

  const handleHeaderSave = () => {
    if (editingHeaderIndex === null || !company) return;
    const newHeaders = [...headers];
    newHeaders[editingHeaderIndex] = tempHeaderText;
    setHeaders(newHeaders);
    updateCompany(company.id, { auditScheduleHeaders: newHeaders });
    setEditingHeaderIndex(null);
  };
  
  const handleMonthHeaderClick = (index: number) => {
    setEditingMonthHeaderIndex(index);
    setTempMonthHeaderText(monthHeaders[index]);
  };

  const handleMonthHeaderSave = () => {
    if (editingMonthHeaderIndex === null || !company) return;
    const newHeaders = [...monthHeaders];
    newHeaders[editingMonthHeaderIndex] = tempMonthHeaderText;
    setMonthHeaders(newHeaders);
    updateCompany(company.id, { auditScheduleMonthHeaders: newHeaders });
    setEditingMonthHeaderIndex(null);
  };

  const handleYearSave = () => {
    const newYear = parseInt(tempYear, 10);
    if (!isNaN(newYear) && company) {
      setYear(newYear);
      updateCompany(company.id, { auditScheduleYear: newYear });
    }
    setIsYearEditing(false);
  };
  
  const getScheduleItem = (area: CompanyAuditArea, monthIndex: number): AuditScheduleItem => {
    return schedule.find(item => item.area === area.name && item.monthIndex === monthIndex && item.year === year) 
           || { id: `${area.id}-${monthIndex}-${year}`, area: area.name, monthIndex, year: year, status: 'Not Scheduled' };
  };

  const handleStatusChange = (item: AuditScheduleItem, newStatus: AuditStatus) => {
    onUpdate({ ...item, status: newStatus });
  };

  const handleEditClick = (index: number, name: string) => {
    setEditingIndex(index);
    setTempAreaName(name);
  };

  const handleSaveClick = (areaId: string) => {
    onAreaUpdate(areaId, tempAreaName);
    setEditingIndex(null);
  };
  
  const handleCancelClick = () => {
    setEditingIndex(null);
  };

  return (
    <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Annual Audit Schedule for</h3>
            {isYearEditing ? (
                <Input
                    type="number"
                    value={tempYear}
                    onChange={(e) => setTempYear(e.target.value)}
                    onBlur={handleYearSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleYearSave();
                        if (e.key === 'Escape') setIsYearEditing(false);
                    }}
                    autoFocus
                    className="h-8 w-24 text-lg font-semibold p-1"
                />
            ) : (
                <button onClick={() => { setIsYearEditing(true); setTempYear(year.toString()); }} className="text-lg font-semibold p-1 rounded-md hover:bg-muted">
                    {year}
                </button>
            )}
        </div>
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="min-w-[1600px]">
        <div className="sticky top-0 z-20 bg-card">
            <div className="grid font-semibold" style={{ gridTemplateColumns: '250px repeat(12, 1fr)' }}>
                <div className="p-3 border-b border-r text-center flex items-center justify-center row-span-2">Audit Area</div>
                
                {headers.map((headerText, index) => (
                    <div key={index} className="p-3 text-center border-b border-r last:border-r-0 flex items-center justify-center" style={{ gridColumn: `span 3 / span 3`}}>
                        {editingHeaderIndex === index ? (
                        <Input
                            value={tempHeaderText}
                            onChange={(e) => setTempHeaderText(e.target.value)}
                            onBlur={handleHeaderSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleHeaderSave();
                                if (e.key === 'Escape') setEditingHeaderIndex(null);
                            }}
                            autoFocus
                            className="h-8 text-center bg-background"
                        />
                        ) : (
                        <span onClick={() => handleHeaderClick(index)} className="cursor-pointer hover:bg-muted-foreground/20 p-1 rounded-md">
                            {headerText}
                        </span>
                        )}
                    </div>
                ))}

                 {monthHeaders.map((headerText, index) => (
                    <div key={index} className="p-2 text-center border-b border-r last:border-r-0 flex items-center justify-center text-sm">
                        {editingMonthHeaderIndex === index ? (
                            <Input
                                value={tempMonthHeaderText}
                                onChange={(e) => setTempMonthHeaderText(e.target.value)}
                                onBlur={handleMonthHeaderSave}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleMonthHeaderSave();
                                    if (e.key === 'Escape') setEditingMonthHeaderIndex(null);
                                }}
                                autoFocus
                                className="h-7 text-center text-sm bg-background"
                            />
                        ) : (
                            <span onClick={() => handleMonthHeaderClick(index)} className="cursor-pointer hover:bg-muted-foreground/20 p-1 rounded-md">
                                {headerText}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '250px repeat(12, 1fr)' }}>
          {auditAreas.flatMap((area, index) => [
              <div key={area.id} className="p-2 border-b border-r font-medium flex items-center justify-between gap-2">
                {editingIndex === index ? (
                  <Input
                    value={tempAreaName}
                    onChange={(e) => setTempAreaName(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <span>{area.name}</span>
                )}
                <div className="flex items-center">
                    {editingIndex === index ? (
                        <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleSaveClick(area.id)}
                            >
                                <Save className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAreaDelete(area.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </>
                    ) : (
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(index, area.name)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                </div>
              </div>,
              ...Array.from({ length: 12 }).map((_, monthIndex) => {
                  const item = getScheduleItem(area, monthIndex);
                  return (
                    <Popover key={`${area.id}-${monthIndex}`}>
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
              })
          ])}
        </div>
        <div className="p-2 border-t">
            <Button variant="outline" size="sm" onClick={onAreaAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Area
            </Button>
        </div>
      </div>
       <ScrollBar orientation="horizontal" />
    </ScrollArea>
    </div>
  );
}
