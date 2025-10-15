

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert, NonConformanceIssue, CorrectiveActionPlan, Risk, SafetyObjective, AuditChecklist, User, ComplianceItem, CompanyDepartment, Aircraft, Department } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, startOfMonth, differenceInDays, isAfter } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent, RotateCw, FileText, Trash2, PlusCircle, Edit, Database, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuditSchedule } from './audit-schedule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, updateDoc, writeBatch, deleteDoc, getCountFromServer, limit, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls.ts';
import { AuditChecklistsManager } from './audit-checklists-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CapTracker } from './cap-tracker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { complianceData as seedComplianceData } from '@/lib/data-provider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils.tsx';
import { useForm } from 'react-hook-form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const ComplianceItemForm = ({
  onSubmit,
  personnel,
  existingItem
}: {
  onSubmit: (data: Omit<ComplianceItem, 'id' | 'companyId'>) => void;
  personnel: User[];
  existingItem?: ComplianceItem | null;
}) => {
  const complianceItemSchema = z.object({
    regulation: z.string().min(3, 'Regulation is required.'),
    process: z.string().min(5, 'Process description is required.'),
    responsibleManager: z.string().min(1, 'Responsible Manager is required.'),
    nextAuditDate: z.date().optional().nullable(),
  });

  type ComplianceFormValues = z.infer<typeof complianceItemSchema>;
  
  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceItemSchema),
    defaultValues: existingItem
      ? {
          ...existingItem,
          nextAuditDate: existingItem.nextAuditDate ? parseISO(existingItem.nextAuditDate) : null,
        }
      : {
          regulation: '',
          process: '',
          responsibleManager: '',
        },
  });

  const handleFormSubmit = (data: ComplianceFormValues) => {
    onSubmit({
        ...data,
        nextAuditDate: data.nextAuditDate ? format(data.nextAuditDate, 'yyyy-MM-dd') : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="regulation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regulation (e.g., CAR Part 121.03.5)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="process"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compliance Process/Procedure</FormLabel>
              <FormControl><Textarea placeholder="Describe the process or reference the manual section..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responsibleManager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsible Manager</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a manager" /></SelectTrigger></FormControl>
                <SelectContent>
                  {personnel.filter(p => p.role.toLowerCase().includes('manager')).map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name} ({p.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="nextAuditDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Next Audit Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn( "w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus/></PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit">{existingItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
};


const CoherenceMatrix = ({ audits: initialAudits, personnel: initialPersonnel }: { audits: QualityAudit[], personnel: User[] }) => {
    const { company, user, loading } = useUser();
    const { toast } = useToast();
    const [complianceItems, setComplianceItems] = React.useState<ComplianceItem[]>([]);
    const [personnel, setPersonnel] = React.useState<User[]>(initialPersonnel);
    const [audits, setAudits] = React.useState<QualityAudit[]>(initialAudits);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<ComplianceItem | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const complianceQuery = query(collection(db, `companies/${company.id}/compliance-matrix`));
            const complianceSnapshot = await getDocs(complianceQuery);
            setComplianceItems(complianceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComplianceItem)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load coherence matrix data.' });
        }
    }, [company, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
     React.useEffect(() => {
        setAudits(initialAudits);
        setPersonnel(initialPersonnel);
    }, [initialAudits, initialPersonnel]);

    const getAuditDataForRegulation = (regulation: string) => {
        const relevantAudits = audits.filter(audit =>
            audit.checklistItems && audit.checklistItems.some(item => item.regulationReference === regulation)
        );

        if (relevantAudits.length === 0) {
            return { lastAuditDate: 'N/A', findings: 'None' };
        }

        const mostRecentAudit = relevantAudits.reduce((latest, current) => {
            return isAfter(parseISO(current.date), parseISO(latest.date)) ? current : latest;
        });
        
        const findings = mostRecentAudit.nonConformanceIssues
            .filter(issue => issue.regulationReference === regulation)
            .map(issue => issue.id.substring(0,8)) // Or some identifier
            .join(', ');

        return {
            lastAuditDate: format(parseISO(mostRecentAudit.date), 'dd MMM yyyy'),
            findings: findings || 'None',
        };
    };

    const canEdit = user?.permissions.includes('Quality:Edit') || user?.permissions.includes('Super User');

    const handleFormSubmit = async (data: Omit<ComplianceItem, 'id' | 'companyId'>) => {
        if (!company) return;

        const itemData = { ...data, companyId: company.id };

        try {
            if (editingItem) {
                const itemRef = doc(db, `companies/${company.id}/compliance-matrix`, editingItem.id);
                await updateDoc(itemRef, itemData);
                toast({ title: 'Item Updated' });
            } else {
                await addDoc(collection(db, `companies/${company.id}/compliance-matrix`), itemData);
                toast({ title: 'Item Added' });
            }
            fetchData();
            setIsDialogOpen(false);
            setEditingItem(null);
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save item.' });
        }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!company) return;
        try {
            const docRef = doc(db, `companies/${company.id}/compliance-matrix`, itemId);
            await deleteDoc(docRef);
            fetchData();
            toast({title: 'Item Deleted'});
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete item.' });
        }
    };
    
    const handleSeedData = async () => {
        if (!company) return;
        const batch = writeBatch(db);
        const matrixCollectionRef = collection(db, `companies/${company.id}/compliance-matrix`);
        
        seedComplianceData.forEach(item => {
            const docRef = doc(matrixCollectionRef);
            const { findings, ...itemToSeed } = item;
            batch.set(docRef, {...itemToSeed, companyId: company.id});
        });
        
        try {
            await batch.commit();
            fetchData();
            toast({title: 'Sample Data Seeded', description: 'The coherence matrix has been populated with Part 141 regulations.'})
        } catch (error) {
            console.error("Error seeding coherence matrix:", error);
            toast({ variant: 'destructive', title: 'Seeding Failed', description: 'Could not seed coherence matrix data.' });
        }
    };

    if (loading) {
        return <main className="flex-1 p-4 md:p-8"><p>Loading...</p></main>;
    }

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>Coherence Matrix</CardTitle>
                    <CardDescription>
                        A tabulated document listing applicable regulatory requirements and corresponding compliance processes.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <>
                            <Button variant="outline" onClick={handleSeedData}>
                              <Database className="mr-2 h-4 w-4" />
                              Seed Part 141 Regulations
                            </Button>
                            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Requirement</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{editingItem ? 'Edit' : 'Add'} Compliance Item</DialogTitle>
                                    </DialogHeader>
                                    <ComplianceItemForm onSubmit={handleFormSubmit} personnel={personnel} existingItem={editingItem} />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[15%]">Regulation</TableHead>
                            <TableHead className="w-[35%]">Process for Compliance</TableHead>
                            <TableHead className="w-[15%]">Responsible Manager</TableHead>
                            <TableHead className="w-[10%]">Last Audit</TableHead>
                            <TableHead className="w-[10%]">Next Audit</TableHead>
                            <TableHead className="w-[10%]">Findings</TableHead>
                            {canEdit && <TableHead className="w-[5%] text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complianceItems.length > 0 ? complianceItems.map(item => {
                            const { lastAuditDate, findings } = getAuditDataForRegulation(item.regulation);
                            return (
                            <TableRow key={item.id}>
                                <TableCell className="font-semibold">{item.regulation}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{item.process}</TableCell>
                                <TableCell>{item.responsibleManager}</TableCell>
                                <TableCell>{lastAuditDate}</TableCell>
                                <TableCell>{item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                <TableCell>{findings}</TableCell>
                                {canEdit && (
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center">No compliance items have been added.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


const ComplianceChart = ({ data }: { data: QualityAudit[] }) => {
  const chartData = data.map(audit => ({
    date: format(parseISO(audit.date), 'MMM yy'),
    score: audit.complianceScore,
  })).reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[80, 100]} unit="%" />
        <Tooltip
            contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
            }}
        />
        <Legend />
        <Line type="monotone" dataKey="score" name="Compliance Score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const NonConformanceChart = ({ data }: { data: QualityAudit[] }) => {
    const conformanceCounts: { [key: string]: number } = {};
    data.flatMap(audit => audit.nonConformanceIssues).forEach(issue => {
        const category = issue.regulationReference?.split(' ')[0] || 'Uncategorized';
        conformanceCounts[category] = (conformanceCounts[category] || 0) + 1;
    });

    const chartData = Object.keys(conformanceCounts).map(key => ({
        name: key,
        count: conformanceCounts[key],
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                    }}
                />
                <Legend />
                <Bar dataKey="count" name="Issues" fill="hsl(var(--primary))" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const INITIAL_AUDIT_AREAS = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Ground Ops'];

export function QualityPageContent({
    initialAudits,
    initialSchedule,
    initialChecklists,
    initialPersonnel,
    initialDepartments,
    initialAircraft,
}: {
    initialAudits: QualityAudit[],
    initialSchedule: AuditScheduleItem[],
    initialChecklists: AuditChecklist[],
    initialPersonnel: User[],
    initialDepartments: CompanyDepartment[],
    initialAircraft: Aircraft[],
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab');

  const [audits, setAudits] = useState<QualityAudit[]>(initialAudits);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>(initialSchedule);
  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const { user, company, loading } = useUser();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);
  
  useEffect(() => {
    setAudits(initialAudits);
    setSchedule(initialSchedule);
  }, [initialAudits, initialSchedule]);

  const activeAudits = useMemo(() => audits.filter(audit => audit.status !== 'Archived'), [audits]);
  const archivedAudits = useMemo(() => audits.filter(audit => audit.status === 'Archived'), [audits]);
  
  const reportsControls = useTableControls(activeAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName'],
  });
  
  const archivedReportsControls = useTableControls(archivedAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName'],
  });

  const getStatusVariant = (status: QualityAudit['status']) => {
    switch (status) {
      case 'Closed': return 'success';
      case 'Open': return 'warning';
      case 'Archived': return 'secondary';
      default: return 'outline';
    }
  };
  
  const handleScheduleUpdate = async (updatedItem: AuditScheduleItem) => {
    if (!company) return;
    
    const existingIndex = schedule.findIndex(item => item.id === updatedItem.id);
    if (existingIndex > -1) {
      const newSchedule = [...schedule];
      newSchedule[existingIndex] = updatedItem;
      setSchedule(newSchedule);
    } else {
      setSchedule([...schedule, updatedItem]);
    }
    
    try {
        const scheduleRef = doc(db, `companies/${company.id}/audit-schedule-items`, updatedItem.id);
        await setDoc(scheduleRef, updatedItem, { merge: true });
    } catch(error) {
        console.error("Error updating schedule item:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save schedule update.' });
    }
  };

  const handleAreaUpdate = (index: number, newName: string) => {
    const oldName = auditAreas[index];
    setAuditAreas(prevAreas => {
        const newAreas = [...prevAreas];
        newAreas[index] = newName;
        return newAreas;
    });
    setSchedule(prevSchedule =>
      prevSchedule.map(item => (item.area === oldName ? { ...item, area: newName } : item))
    );
  };

  const handleAreaAdd = () => {
      const newAreaName = `New Area ${auditAreas.length + 1}`;
      setAuditAreas(prev => [...prev, newAreaName]);
  };

  const handleAreaDelete = (index: number) => {
    const areaToDelete = auditAreas[index];
    setAuditAreas(prev => prev.filter((_, i) => i !== index));
    setSchedule(prevSchedule => prevSchedule.filter(item => item.area !== areaToDelete));
  };
  
  const handleArchiveAudit = async (auditId: string) => {
    if (!company) return;
    
    try {
        const batch = writeBatch(db);

        // 1. Update the audit status to 'Archived'
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        batch.update(auditRef, { status: 'Archived' });
        
        // 2. Find and delete all alerts related to this audit
        const alertsRef = collection(db, `companies/${company.id}/alerts`);
        const alertsQuery = query(alertsRef, where("relatedLink", "==", `/quality/${auditId}`));
        const alertsSnapshot = await getDocs(alertsQuery);
        alertsSnapshot.forEach(alertDoc => {
            batch.delete(alertDoc.ref);
        });

        // 3. Commit the batch
        await batch.commit();

        setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: 'Archived' } : a));
        
        toast({
            title: 'Audit Archived',
            description: `The audit and its ${alertsSnapshot.size} related notification(s) have been removed.`,
        });

    } catch (error) {
        console.error("Error archiving audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive audit.' });
    }
  };
  
  const handleRestoreAudit = async (auditId: string) => {
    if (!company) return;
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        await updateDoc(auditRef, { status: 'Closed' });
        setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: 'Closed' } : a));
        toast({
            title: 'Audit Restored',
            description: 'The audit has been restored to a closed state.',
        });
    } catch (error) {
        console.error("Error restoring audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to restore audit.' });
    }
  };
  
  const handleBulkRestore = async () => {
    if (!company || selectedAudits.length === 0) return;

    const batch = writeBatch(db);
    selectedAudits.forEach(auditId => {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        batch.update(auditRef, { status: 'Closed' });
    });

    try {
        await batch.commit();
        setAudits(prev => prev.map(a => selectedAudits.includes(a.id) ? { ...a, status: 'Closed' } : a));
        setSelectedAudits([]);
        toast({
            title: 'Audits Restored',
            description: `${selectedAudits.length} audit(s) have been restored.`,
        });
    } catch (error) {
        console.error("Error restoring audits:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to restore selected audits.' });
    }
  };
  
  const handleSelectAll = (checked: boolean, controls: ReturnType<typeof useTableControls>) => {
    if (checked) {
        setSelectedAudits(controls.items.map(a => a.id));
    } else {
        setSelectedAudits([]);
    }
  }

  const handleSelectOne = (auditId: string, checked: boolean) => {
    if (checked) {
        setSelectedAudits(prev => [...prev, auditId]);
    } else {
        setSelectedAudits(prev => prev.filter(id => id !== auditId));
    }
  }

  const handleDeleteAudit = async (auditId: string) => {
    if (!company) return;
    try {
      const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
      await deleteDoc(auditRef);
      setAudits(prev => prev.filter(a => a.id !== auditId));
      toast({
        title: 'Audit Deleted',
        description: 'The audit has been permanently deleted.',
      });
    } catch (error) {
      console.error("Error deleting audit:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not permanently delete the audit.',
      });
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const groupAuditsByDepartment = (audits: QualityAudit[]) => {
    return audits.reduce((acc, audit) => {
      const department = audit.department || 'Uncategorized';
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(audit);
      return acc;
    }, {} as Record<string, QualityAudit[]>);
  };
  
  const groupedActiveAudits = useMemo(() => groupAuditsByDepartment(reportsControls.items), [reportsControls.items]);
  const groupedArchivedAudits = useMemo(() => groupAuditsByDepartment(archivedReportsControls.items), [archivedReportsControls.items]);


  const ReportTable = ({ reports, controls, showArchived }: { reports: QualityAudit[], controls: ReturnType<typeof useTableControls>, showArchived: boolean }) => {
    return (
        <Table>
          <TableHeader>
              <TableRow>
              {showArchived && (
                  <TableHead className="w-12">
                      <Checkbox 
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked), controls)}
                          checked={selectedAudits.length > 0 && selectedAudits.length === controls.items.length}
                          aria-label="Select all"
                      />
                  </TableHead>
              )}
              <TableHead>Audit ID</TableHead>
              <TableHead>Audit Date</TableHead>
              <TableHead>Report Heading</TableHead>
              <TableHead>Auditee</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {reports.length > 0 ? (
                  reports.map(audit => (
                  <TableRow key={audit.id} data-state={selectedAudits.includes(audit.id) && "selected"}>
                      {showArchived && (
                          <TableCell>
                              <Checkbox
                                  checked={selectedAudits.includes(audit.id)}
                                  onCheckedChange={(checked) => handleSelectOne(audit.id, !!checked)}
                                  aria-label="Select row"
                              />
                          </TableCell>
                      )}
                      <TableCell>
                      <Link href={`/quality/${audit.id}`} className="hover:underline">
                          {audit.auditNumber || audit.id.substring(0, 8)}
                      </Link>
                      </TableCell>
                      <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{audit.title}</TableCell>
                      <TableCell>{audit.auditeeName || 'N/A'}</TableCell>
                      <TableCell>{audit.area}</TableCell>
                      <TableCell>{audit.aircraftInvolved || 'N/A'}</TableCell>
                      <TableCell>{audit.type}</TableCell>
                      <TableCell>
                          <div className={`flex items-center gap-1 font-semibold ${getComplianceColor(audit.complianceScore)}`}>
                              <Percent className="h-4 w-4" />
                              {audit.complianceScore}%
                          </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant={getStatusVariant(audit.status)}>{audit.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Actions</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                  {showArchived ? (
                                      <>
                                        <DropdownMenuItem onSelect={() => handleRestoreAudit(audit.id)}>
                                            <RotateCw className="mr-2 h-4 w-4" />
                                            Restore
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the audit "{audit.title}" and all its associated data.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAudit(audit.id)}>Yes, delete audit</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                  ) : (
                                      <DropdownMenuItem onSelect={() => handleArchiveAudit(audit.id)}>
                                          <Archive className="mr-2 h-4 w-4" />
                                          Archive
                                      </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={showArchived ? 11 : 10} className="text-center h-24">
                          No audit reports found in this department.
                      </TableCell>
                  </TableRow>
              )}
          </TableBody>
        </Table>
    );
  };


  return (
      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 no-print">
            <TabsList className="grid w-full grid-cols-2 md:flex md:w-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="audits">Audits</TabsTrigger>
              <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
              <TabsTrigger value="cap-tracker">CAP Tracker</TabsTrigger>
              <TabsTrigger value="coherence-matrix">Coherence Matrix</TabsTrigger>
          </TabsList>
          </div>
          <TabsContent value="dashboard" className="space-y-8 mt-4">
               <Card>
                  <CardHeader>
                      <CardTitle>Annual Audit Schedule</CardTitle>
                      <CardDescription>Plan and track internal and external audits for the year. Click on a quarter to update the status.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <AuditSchedule 
                          auditAreas={auditAreas}
                          schedule={schedule} 
                          onUpdate={handleScheduleUpdate}
                          onAreaUpdate={handleAreaUpdate}
                          onAreaAdd={handleAreaAdd}
                          onAreaDelete={handleAreaDelete}
                      />
                  </CardContent>
              </Card>

              <div className="grid gap-8 md:grid-cols-2">
                  <Card>
                      <CardHeader>
                          <CardTitle>Compliance Score Over Time</CardTitle>
                          <CardDescription>Tracks the overall compliance score from recent audits.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ComplianceChart data={activeAudits} />
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Non-Conformance Categories</CardTitle>
                          <CardDescription>Frequency of different types of non-conformance issues.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <NonConformanceChart data={activeAudits} />
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>
          <TabsContent value="audits" className="mt-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Audit Reports</CardTitle>
                      <CardDescription>Review all completed quality audit reports.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="active">
                        <TabsList>
                            <TabsTrigger value="active" onClick={() => setShowArchived(false)}>Active Audits</TabsTrigger>
                            <TabsTrigger value="archived" onClick={() => setShowArchived(true)}>Archived Audits</TabsTrigger>
                        </TabsList>
                         <div className="flex items-center py-4">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                placeholder="Search audits..."
                                value={showArchived ? archivedReportsControls.searchTerm : reportsControls.searchTerm}
                                onChange={(e) => showArchived ? archivedReportsControls.setSearchTerm(e.target.value) : reportsControls.setSearchTerm(e.target.value)}
                                className="pl-10"
                                />
                            </div>
                        </div>
                        <TabsContent value="active" className="mt-4 space-y-8">
                             {Object.keys(groupedActiveAudits).sort().map(department => (
                                <div key={department}>
                                    <h3 className="text-lg font-semibold mb-2">{department}</h3>
                                    <ReportTable reports={groupedActiveAudits[department]} controls={reportsControls} showArchived={false} />
                                </div>
                            ))}
                            {Object.keys(groupedActiveAudits).length === 0 && (
                                <div className="text-center text-muted-foreground py-10">No active reports found.</div>
                            )}
                        </TabsContent>
                         <TabsContent value="archived" className="mt-4 space-y-8">
                            <div className="flex justify-end mb-4">
                                {selectedAudits.length > 0 && (
                                    <Button variant="outline" onClick={handleBulkRestore}>
                                        <RotateCw className="mr-2 h-4 w-4" />
                                        Restore Selected ({selectedAudits.length})
                                    </Button>
                                )}
                            </div>
                            {Object.keys(groupedArchivedAudits).sort().map(department => (
                                <div key={department}>
                                    <h3 className="text-lg font-semibold mb-2">{department}</h3>
                                    <ReportTable reports={groupedArchivedAudits[department]} controls={archivedReportsControls} showArchived={true} />
                                </div>
                            ))}
                            {Object.keys(groupedArchivedAudits).length === 0 && (
                                <div className="text-center text-muted-foreground py-10">No archived reports found.</div>
                            )}
                        </TabsContent>
                    </Tabs>
                  </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="checklists" className="mt-4">
              <AuditChecklistsManager 
                initialTemplates={initialChecklists} 
                initialPersonnel={initialPersonnel}
                initialDepartments={initialDepartments}
                initialAircraft={initialAircraft}
              />
          </TabsContent>
          <TabsContent value="cap-tracker" className="mt-4">
              <CapTracker audits={audits} />
          </TabsContent>
          <TabsContent value="coherence-matrix" className="mt-4">
            <ScrollArea className="w-full whitespace-nowrap">
              <CoherenceMatrix audits={audits} personnel={initialPersonnel} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
  );
}
