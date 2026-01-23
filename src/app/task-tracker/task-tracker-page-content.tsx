
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns';
import type { UnifiedTask, User } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useRouter } from 'next/navigation';


interface TaskTrackerProps {
  initialTasks: UnifiedTask[];
  personnel: User[];
}

const getCategoryName = (sourceType: string) => {
    switch (sourceType) {
        case 'Quality Audit': return 'Corrective Action Plan (CAP)';
        case 'Safety Report': return 'Safety Task';
        case 'MOC': return 'Change Mitigation';
        default: return 'Task';
    }
};

export function TaskTrackerPageContent({ initialTasks, personnel }: TaskTrackerProps) {
  const [tasks, setTasks] = React.useState<UnifiedTask[]>(initialTasks);
  const router = useRouter();
  
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const groupedTasks = React.useMemo(() => {
    return tasks.reduce((acc, task) => {
      const categoryName = getCategoryName(task.sourceType);
      const sourceKey = `${categoryName}: ${task.sourceTitle}`;
      if (!acc[sourceKey]) {
        acc[sourceKey] = {
          sourceId: task.sourceId,
          sourceType: task.sourceType,
          tasks: [],
        };
      }
      acc[sourceKey].tasks.push(task);
      return acc;
    }, {} as Record<string, { sourceId: string, sourceType: string, tasks: UnifiedTask[] }>);
  }, [tasks]);

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Open': case 'Not Started': return 'warning';
      case 'In Progress': return 'primary';
      case 'Completed': return 'success';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  }
  
  const getSourceLink = (task: UnifiedTask) => {
    switch (task.sourceType) {
        case 'Quality Audit': return `/quality/${task.sourceId}`;
        case 'Safety Report': return `/safety/${task.sourceId}`;
        case 'MOC': return `/safety/moc/${task.sourceId}`;
        default: return '#';
    }
  }

  const renderDueDate = (dateString: string) => {
    try {
        const date = parseISO(dateString);
        if (isValid(date)) {
            return format(date, 'PPP');
        }
    } catch (e) {
        // Fallback for invalid date strings
    }
    return 'N/A';
  };

  return (
    <main className="flex-1 p-4 md:p-8">
    <Card>
      <CardHeader>
        <CardTitle>Unified Task Tracker</CardTitle>
        <CardDescription>
          A centralized view of all tasks and corrective actions from Safety, Quality, and MOC processes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(groupedTasks).length > 0 ? (
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedTasks)}>
          {Object.entries(groupedTasks).map(([sourceTitle, group]) => (
            <AccordionItem value={sourceTitle} key={sourceTitle}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                    <span className="font-semibold">{sourceTitle}</span>
                    <Badge>{group.tasks.length} task(s)</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Task / Action</TableHead>
                            <TableHead>Responsible</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {group.tasks.map(task => (
                            <TableRow 
                                key={task.id} 
                                onClick={() => router.push(getSourceLink(task))} 
                                className="cursor-pointer hover:bg-muted/50"
                            >
                                <TableCell>{task.description}</TableCell>
                                <TableCell>{task.responsiblePerson}</TableCell>
                                <TableCell>{renderDueDate(task.dueDate)}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No outstanding tasks or corrective actions found across all systems.</p>
            </div>
        )}
      </CardContent>
    </Card>
    </main>
  );
}
