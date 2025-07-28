'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ComplianceItem, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, where } from 'firebase/firestore';
import { PlusCircle, Edit, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils.tsx';
import { Textarea } from '@/components/ui/textarea';
import { complianceData } from '@/lib/data-provider';


const complianceItemSchema = z.object({
  regulation: z.string().min(3, 'Regulation is required.'),
  process: z.string().min(5, 'Process description is required.'),
  responsibleManager: z.string().min(1, 'Responsible Manager is required.'),
  lastAuditDate: z.date().optional().nullable(),
  nextAuditDate: z.date().optional().nullable(),
  findings: z.string().optional(),
});

type ComplianceFormValues = z.infer<typeof complianceItemSchema>;

const ComplianceItemForm = ({
  onSubmit,
  personnel,
  existingItem
}: {
  onSubmit: (data: Omit<ComplianceItem, 'id' | 'companyId'>) => void;
  personnel: User[];
  existingItem?: ComplianceItem | null;
}) => {
  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceItemSchema),
    defaultValues: existingItem
      ? {
          ...existingItem,
          lastAuditDate: existingItem.lastAuditDate ? parseISO(existingItem.lastAuditDate) : null,
          nextAuditDate: existingItem.nextAuditDate ? parseISO(existingItem.nextAuditDate) : null,
        }
      : {
          regulation: '',
          process: '',
          responsibleManager: '',
          findings: '',
        },
  });

  const handleFormSubmit = (data: ComplianceFormValues) => {
    onSubmit({
        ...data,
        lastAuditDate: data.lastAuditDate ? format(data.lastAuditDate, 'yyyy-MM-dd') : undefined,
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
                name="lastAuditDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Last Audit Date</FormLabel>
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
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus/>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
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
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus/>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
         <FormField
          control={form.control}
          name="findings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audit Findings (Reference)</FormLabel>
              <FormControl><Textarea placeholder="Reference any audit findings, e.g., 'NCR-004'" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit">{existingItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
};

export default function CoherenceMatrixPage() {
    const { company, user, loading } = useUser();
    const { toast } = useToast();
    const [complianceItems, setComplianceItems] = React.useState<ComplianceItem[]>([]);
    const [personnel, setPersonnel] = React.useState<User[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<ComplianceItem | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const complianceQuery = query(collection(db, `companies/${company.id}/compliance-matrix`));
            const personnelQuery = query(collection(db, `companies/${company.id}/users`));

            const [complianceSnapshot, personnelSnapshot] = await Promise.all([
                getDocs(complianceQuery),
                getDocs(personnelQuery)
            ]);

            setComplianceItems(complianceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComplianceItem)));
            setPersonnel(personnelSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load coherence matrix data.' });
        }
    }, [company, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            await doc(db, `companies/${company.id}/compliance-matrix`, itemId).delete();
            fetchData();
            toast({title: 'Item Deleted'});
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete item.' });
        }
    }
    
    const handleSeedData = async () => {
        if (!company) return;
        const batch = writeBatch(db);
        complianceData.forEach(item => {
            const docRef = doc(collection(db, `companies/${company.id}/compliance-matrix`));
            batch.set(docRef, {...item, companyId: company.id});
        });
        await batch.commit();
        fetchData();
        toast({title: 'Sample Data Seeded', description: 'Sample compliance data has been added.'})
    }

    if (loading) {
        return <main className="flex-1 p-4 md:p-8"><p>Loading...</p></main>;
    }

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle>Coherence Matrix</CardTitle>
                        <CardDescription>
                            A tabulated document listing applicable regulatory requirements and corresponding compliance processes.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href="/quality">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Quality Dashboard
                            </Link>
                        </Button>
                        {canEdit && (
                            <>
                                <Button variant="outline" onClick={handleSeedData}>Seed Sample Data</Button>
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
                            {complianceItems.length > 0 ? complianceItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-semibold">{item.regulation}</TableCell>
                                    <TableCell className="whitespace-pre-wrap">{item.process}</TableCell>
                                    <TableCell>{item.responsibleManager}</TableCell>
                                    <TableCell>{item.lastAuditDate ? format(parseISO(item.lastAuditDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{item.findings || 'None'}</TableCell>
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
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center">No compliance items have been added.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}

CoherenceMatrixPage.title = "Coherence Matrix";
```
  </change>
  <change>
    <file>/src/app/quality/page.tsx</file>
    <content><![CDATA[

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert, NonConformanceIssue, CorrectiveActionPlan, Risk, SafetyObjective } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent, RotateCcw, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuditSchedule } from './audit-schedule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AuditChecklistsManager } from './audit-checklists-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CapTracker } from './cap-tracker';


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

const INITIAL_AUDIT_AREAS = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

function QualityPage() {
  const searchParams = useSearchParams();
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);
  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const { user, company, loading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);

  const fetchData = async () => {
    if (!company) return;
    try {
        const auditsQuery = query(collection(db, `companies/${company.id}/quality-audits`));
        const scheduleQuery = query(collection(db, `companies/${company.id}/audit-schedule-items`));

        const [auditsSnapshot, scheduleSnapshot] = await Promise.all([
            getDocs(auditsQuery),
            getDocs(scheduleQuery),
        ]);
        
        const auditsList = auditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityAudit));
        setAudits(auditsList);

        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditScheduleItem));
        setSchedule(scheduleList);

    } catch (error) {
        console.error("Error fetching quality data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quality data.' });
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (company) {
        fetchData();
    }
  }, [user, company, loading, router, toast]);

  const activeAudits = audits.filter(audit => audit.status !== 'Archived');
  const archivedAudits = audits.filter(audit => audit.status === 'Archived');
  const displayedAudits = showArchived ? archivedAudits : activeAudits;

  const filteredAudits = displayedAudits.filter(audit => {
    const searchLower = searchTerm.toLowerCase();
    return (
        audit.id.toLowerCase().includes(searchLower) ||
        audit.title.toLowerCase().includes(searchLower) ||
        audit.auditor.toLowerCase().includes(searchLower) ||
        audit.status.toLowerCase().includes(searchLower) ||
        audit.type.toLowerCase().includes(searchLower)
    );
  });
  
  useEffect(() => {
    setSelectedAudits([]);
  }, [showArchived]);


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
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedAudits(filteredAudits.map(a => a.id));
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


  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  }


  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="audits">Audits</TabsTrigger>
                <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
                <TabsTrigger value="cap-tracker">CAP Tracker</TabsTrigger>
            </TabsList>
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
                 <div className="grid gap-8 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coherence Matrix</CardTitle>
                            <CardDescription>A tabulated document listing applicable regulatory requirements and corresponding compliance processes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <p className="text-sm text-muted-foreground">The full coherence matrix provides a detailed view of all regulatory requirements, the processes in place to ensure compliance, the responsible manager for each process, and audit validation details. This is a key tool for demonstrating regulatory compliance to the CAA.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild>
                                <Link href="/quality/coherence-matrix">
                                    <FileText className="mr-2 h-4 w-4"/>
                                    View Full Coherence Matrix
                                </Link>
                            </Button>
                        </CardFooter>
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
                        <div className="flex items-center justify-between py-4">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                placeholder="Search audits..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {showArchived && selectedAudits.length > 0 && (
                                     <Button variant="outline" onClick={handleBulkRestore}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Restore Selected ({selectedAudits.length})
                                    </Button>
                                )}
                                 <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
                                    {showArchived ? (
                                        <>
                                            <ListChecks className="mr-2 h-4 w-4" />
                                            Show Active Audits
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Show Archived Audits
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                {showArchived && (
                                    <TableHead className="w-12">
                                        <Checkbox 
                                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                            checked={selectedAudits.length > 0 && selectedAudits.length === filteredAudits.length}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                )}
                                <TableHead>Audit ID</TableHead>
                                <TableHead>Audit Date</TableHead>
                                <TableHead>Report Heading</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Compliance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAudits.length > 0 ? (
                                    filteredAudits.map(audit => (
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
                                            {audit.id.substring(0, 8)}...
                                        </Link>
                                        </TableCell>
                                        <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{audit.title}</TableCell>
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
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {showArchived ? (
                                                        <DropdownMenuItem onSelect={() => handleRestoreAudit(audit.id)}>
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            Restore
                                                        </DropdownMenuItem>
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
                                        <TableCell colSpan={showArchived ? 8 : 7} className="text-center h-24">
                                            No audit reports found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="checklists" className="mt-4">
                <AuditChecklistsManager />
            </TabsContent>
            <TabsContent value="cap-tracker" className="mt-4">
                <CapTracker audits={audits} />
            </TabsContent>
        </Tabs>
      </main>
  );
}

QualityPage.title = 'Quality Assurance';
export default QualityPage;
```
  </change>
  <change>
    <file>/src/lib/types.ts</file>
    <content><![CDATA[

import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
export type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';

export type Airport = {
  id: string;
  name: string;
  coords: {
    lat: number;
    lon: number;
  };
};

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
};

export type Feature = 'AdvancedAnalytics' | 'AIAuditAnalysis' | 'CustomChecklists';

export type Company = {
  id: string;
  name: string;
  trademark?: string;
  theme?: Partial<ThemeColors>;
  enabledFeatures?: Feature[];
  logoUrl?: string;
};

export type Aircraft = {
  id: string;
  companyId: string;
  tailNumber: string;
  model: string;
  status: 'Available' | 'In Maintenance' | 'Booked';
  hours: number;
  nextServiceType: string;
  hoursUntilService: number;
  airworthinessExpiry: string;
  insuranceExpiry: string;
  certificateOfReleaseToServiceExpiry: string;
  certificateOfRegistrationExpiry: string;
  massAndBalanceExpiry: string;
  radioStationLicenseExpiry: string;
  location: string; // Airport ID
  isPostFlightPending?: boolean;
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type TrainingLogEntry = {
  id:string;
  date: string;
  aircraft: string;
  startHobbs: number;
  endHobbs: number;
  flightDuration: number;
  instructorNotes: string;
  instructorName: string;
  instructorSignature?: string;
};

export type UserDocument = {
    id: string;
    type: string;
    expiryDate: string | null;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Aircraft:UpdateHobbs'
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'Bookings:Approve'
  | 'Students:View'
  | 'Students:Edit'
  | 'Personnel:View'
  | 'Personnel:Edit'
  | 'Safety:View'
  | 'Safety:Edit'
  | 'Quality:View'
  | 'Quality:Edit'
  | 'Quality:Sign'
  | 'Quality:Delete'
  | 'Checklists:View'
  | 'Checklists:Edit'
  | 'Alerts:View'
  | 'Alerts:Edit'
  | 'Reports:View'
  | 'Reports:Edit'
  | 'Settings:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Aircraft:UpdateHobbs',
    'Bookings:View',
    'Bookings:Edit',
    'Bookings:Approve',
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'Personnel:Edit',
    'Safety:View',
    'Safety:Edit',
    'Quality:View',
    'Quality:Edit',
    'Quality:Sign',
    'Quality:Delete',
    'Checklists:View',
    'Checklists:Edit',
    'Alerts:View',
    'Alerts:Edit',
    'Reports:View',
    'Reports:Edit',
    'Settings:Edit',
    'Super User',
];

export type Department = 'Management' | 'Flight Operations' | 'Ground Operation' | 'Maintenance' | 'External';

export type Role =
  | 'Accountable Manager'
  | 'Admin'
  | 'Aircraft Manager'
  | 'Chief Flight Instructor'
  | 'Driver'
  | 'Front Office'
  | 'Head Of Training'
  | 'HR Manager'
  | 'Instructor'
  | 'Maintenance'
  | 'Operations Manager'
  | 'Quality Manager'
  | 'Safety Manager'
  | 'Student'
  | 'Auditee';

export type User = {
    id: string;
    companyId: string;
    name: string;
    role: Role;
    email?: string;
    phone: string;
    password?: string;
    permissions: Permission[];
    consentDisplayContact?: 'Consented' | 'Not Consented';
    mustChangePassword?: boolean;
    homeAddress?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    nextOfKinEmail?: string;
    // Student-specific
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    // Personnel-specific
    department?: Department;
    medicalExpiry?: string | null;
    licenseExpiry?: string | null;
    documents?: UserDocument[];
    // External Auditee specific
    externalCompanyName?: string;
    externalPosition?: string;
    accessStartDate?: string;
    accessEndDate?: string;
    requiredDocuments?: string[];
};

export type Booking = {
  id: string;
  companyId: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  aircraft: string;
  student: string;
  instructor: string;
  purpose: 'Training' | 'Maintenance' | 'Private';
  status: 'Approved' | 'Completed' | 'Cancelled';
  isChecklistComplete?: boolean;
  isPostFlightChecklistComplete?: boolean;
  flightDuration?: number;
  maintenanceType?: string;
  trainingExercise?: string;
};

export type SafetyReportType = 'Flight Operations Report' | 'Ground Operations Report' | 'Occupational Report' | 'General Report' | 'Aircraft Defect Report';

export type DiscussionEntry = {
  id: string;
  author: string;
  recipient: string;
  message: string;
  datePosted: string;
  replyByDate?: string;
  isCode?: boolean;
};

export type InvestigationDiaryEntry = {
    id: string;
    date: string;
    author: string;
    entryText: string;
};

export type AssociatedRisk = {
    id: string;
    hazard: string;
    risk: string;
    hazardArea: string;
    process: string;
    likelihood: RiskLikelihood;
    severity: RiskSeverity;
    riskScore: number;
    mitigationControls?: string;
    residualLikelihood?: RiskLikelihood;
    residualSeverity?: RiskSeverity;
    residualRiskScore?: number;
    promotedToRegister?: boolean;
}

export type SafetyReport = {
  id: string;
  companyId: string;
  reportNumber: string;
  occurrenceDate: string;
  occurrenceTime?: string;
  filedDate: string;
  closedDate?: string;
  submittedBy: string;
  heading: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Closed';
  type: SafetyReportType;
  department: Department;
  classification?: 'Hazard' | 'Occurrence' | 'Incident' | 'Accident';
  occurrenceCategory?: string;
  subCategory?: string;
  aircraftInvolved?: string;
  location?: string;
  investigationTeam?: string[];
  investigationDiary?: InvestigationDiaryEntry[];
  investigationNotes?: string;
  discussion?: DiscussionEntry[];
  associatedRisks?: AssociatedRisk[];
  correctiveActionPlan?: GenerateCorrectiveActionPlanOutput;
  // Dynamic fields based on category
  raCallout?: string;
  raFollowed?: 'Yes' | 'No';
  weatherConditions?: string;
  visibility?: number;
  windSpeed?: number;
  windDirection?: number;
  birdStrikeDamage?: boolean;
  numberOfBirds?: string;
  sizeOfBirds?: string;
  partOfAircraftStruck?: string;
  eventSubcategoryDetails?: string;
};

export const REPORT_TYPE_DEPARTMENT_MAPPING: Record<SafetyReportType, Department> = {
    'Flight Operations Report': 'Flight Operations',
    'Ground Operations Report': 'Ground Operation',
    'Aircraft Defect Report': 'Maintenance',
    'Occupational Report': 'Management',
    'General Report': 'Management',
};

export type SuggestInvestigationStepsOutput = {
  initialAssessment: string;
  keyAreasToInvestigate: string[];
  recommendedActions: string[];
  potentialContributingFactors: string[];
};

export type FiveWhysAnalysisOutput = {
  problemStatement: string;
  analysis: { why: string; because: string }[];
  rootCause: string;
};

export type CorrectiveAction = {
    action: string;
    responsiblePerson: string;
    deadline: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
}

export type RiskLikelihood = 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Certain';
export type RiskSeverity = 'Insignificant' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';

export type Risk = {
  id: string;
  companyId: string;
  hazard: string;
  risk: string;
  consequences: string[];
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  residualLikelihood?: RiskLikelihood;
  residualSeverity?: RiskSeverity;
  residualRiskScore?: number;
  mitigation: string;
  status: RiskStatus;
  existingMitigation?: string;
  proposedMitigation?: string;
  dateIdentified: string;
  hazardArea: string;
  process: string;
  riskOwner?: string;
  reviewDate?: string;
  reportNumber?: string;
}

export type GroupedRisk = {
  area: string;
  risks: Risk[];
};

export type ChecklistItemType = 
    | 'Checkbox'
    | 'Confirm preflight hobbs'
    | 'Confirm postflight hobbs'
    | 'Confirm premaintenance hobbs'
    | 'Confirm post maintenance hobbs';

export type ChecklistItem = {
    id: string;
    text: string;
    type: ChecklistItemType;
    completed: boolean;
    value: string;
};

export type CompletedChecklist = {
    id: string;
    companyId: string;
    checklistId: string;
    checklistName: string;
    checklistType: 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
    aircraftId: string;
    completedBy: string;
    completionDate: string;
}

export type FindingStatus = 'Compliant' | 'Non-compliant' | 'Partial' | 'Not Applicable' | 'Observation';
export type FindingLevel = 'Level 1 Finding' | 'Level 2 Finding' | 'Level 3 Finding' | 'Observation' | null;

export type AuditChecklistItem = {
    id: string;
    text: string;
    finding: FindingStatus | null;
    level: FindingLevel;
    observation?: string;
    findingNotes?: string;
    evidence?: string;
    regulationReference?: string;
    reference?: string;
    comment?: string;
}

export type AuditArea = 'Personnel' | 'Maintenance' | 'Facilities' | 'Records' | 'Management' | 'Flight Operations' | 'Ground Ops';

export type AuditChecklist = {
    id: string;
    companyId: string;
    title: string;
    area: AuditArea;
    items: AuditChecklistItem[];
    department?: string;
    auditeeName?: string;
    auditeePosition?: string;
    auditor?: string;
}

export const VIEW_ALL_PAGES: Permission[] = [
    'Aircraft:View',
    'Bookings:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
    'Checklists:View',
    'Alerts:View',
    'Reports:View',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    'Accountable Manager': ['Super User'],
    'Admin': ['Super User'],
    'Operations Manager': ['Super User'],
    'HR Manager': [...VIEW_ALL_PAGES, 'Personnel:Edit', 'Settings:Edit'],
    'Safety Manager': [...VIEW_ALL_PAGES, 'Safety:Edit', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
    'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit', 'Quality:Delete', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
    'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Alerts:Edit'],
    'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Checklists:Edit'],
    'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Instructor': [...VIEW_ALL_PAGES, 'Bookings:Edit', 'Bookings:Approve', 'Students:View', 'Checklists:View'],
    'Front Office': [...VIEW_ALL_PAGES],
    'Student': ['Bookings:View', 'Aircraft:View', 'Alerts:View'],
    'Driver': ['Alerts:View'],
    'Auditee': ['Quality:View', 'Alerts:View'],
};

export const ICAO_OCCURRENCE_CATEGORIES = [
    'ADRM', 'AMAN', 'ARC', 'ATM', 'BIRD', 'CABIN', 'CFIT', 'CTOL', 'EVAC', 'EXTL', 'F-NI', 'F-POST', 'FUEL', 'GCOL', 'GTOW', 'ICE', 'LALT', 'LOC-G', 'LOC-I', 'LOLI', 'MAC', 'MED', 'NAV', 'OTHR', 'RAMP', 'RE', 'RI', 'SCF-NP', 'SCF-PP', 'SEC', 'TURB', 'UIMC', 'UNK', 'USOS', 'WILD', 'WSTRW'
].sort();

export const ICAO_PHASES_OF_FLIGHT = [
    'Standing',
    'Pushback/Towing',
    'Taxi',
    'Take-off',
    'Initial Climb',
    'Climb',
    'Cruise',
    'Descent',
    'Approach',
    'Landing',
    'Go-around',
    'Circling',
    'Emergency Descent',
    'Holding',
    'Parked',
    'Maintenance',
    'Other'
].sort();


export type CorrectiveActionPlan = {
  rootCause: string;
  correctiveAction: string;
  preventativeAction: string;
  responsiblePerson: string;
  completionDate: string;
  status: 'Open' | 'Closed' | 'In Progress';
};

export type NonConformanceIssue = {
  id: string;
  itemText: string;
  regulationReference?: string;
  finding: FindingStatus;
  level: FindingLevel;
  comment?: string;
  reference?: string;
  correctiveActionPlan?: CorrectiveActionPlan | null;
};

export type QualityAudit = {
  id: string;
  companyId: string;
  title: string;
  date: string;
  type: 'Internal' | 'External';
  auditor: string;
  auditeeName?: string | null;
  auditeePosition?: string | null;
  area: AuditArea;
  status: 'Open' | 'Closed' | 'Archived';
  complianceScore: number;
  checklistItems: AuditChecklistItem[];
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
  discussion?: DiscussionEntry[];
  investigationTeam?: string[];
  auditorSignature?: string;
  auditeeSignature?: string;
};

export type AuditStatus = 'Scheduled' | 'Completed' | 'Pending' | 'Not Scheduled';

export type AuditScheduleItem = {
  id: string;
  companyId: string;
  area: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: AuditStatus;
};

export type Alert = {
  id: string;
  companyId?: string;
  number?: number;
  type: 'Red Tag' | 'Yellow Tag' | 'Task' | 'Signature Request';
  title: string;
  description: string;
  author: string;
  date: string;
  readBy: string[];
  targetUserId?: string;
  relatedLink?: string;
};

export type ComplianceItem = {
    id: string;
    companyId: string;
    regulation: string;
    process: string;
    responsibleManager: string;
    lastAuditDate?: string;
    nextAuditDate?: string;
    findings?: string;
};

// This type was moved here from `app/checklists/page.tsx`
export type Checklist = {
  id: string;
  companyId: string;
  title: string;
  category: 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
  items: ChecklistItem[];
  templateId?: string; // ID of the master template
  aircraftId?: string; // If null, it's a master template. If populated, it's assigned to an aircraft.
};
```
  </change>
  <change>
    <file>/src/lib/data-provider.ts</file>
    <content><![CDATA[
'use client';

// This file is being kept for now to avoid breaking imports, but it no longer provides mock data.
// All data fetching is now handled directly by components from Firestore.
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company, ComplianceItem } from './types';
import { ROLE_PERMISSIONS } from './types';

export const airportData: Airport[] = [];
export let aircraftData: Aircraft[] = [];
export let userData: User[] = [];

export let bookingData: Booking[] = [];
export const trainingExercisesData: string[] = [
    'Pre-Solo Written Exam',
    'First Solo',
    'Cross-Country',
    'Night Flying',
    'Instrument Rating',
    'Commercial Pilot License',
    'Multi-Engine Rating',
];
export let checklistData: Checklist[] = [];
export let completedChecklistData: CompletedChecklist[] = [];
export let safetyReportData: SafetyReport[] = [];
export let riskRegisterData: Risk[] = [];
export let qualityAuditData: QualityAudit[] = [];
export let auditScheduleData: AuditScheduleItem[] = [];
export let auditChecklistData: AuditChecklist[] = [];
export let allAlerts: Alert[] = [];
export let companyData: Company[] = [];
export const complianceData: Omit<ComplianceItem, 'id'|'companyId'>[] = [
    {
        regulation: 'CAR 121.03.5 (1)',
        process: 'A copy of the Operations Manual is maintained and provided to all relevant personnel. Document control is managed via the Q-Pulse system, procedure QP-DOC-001.',
        responsibleManager: 'Operations Manager',
        lastAuditDate: '2024-05-20',
        nextAuditDate: '2025-05-20',
        findings: 'None'
    },
    {
        regulation: 'CAR 91.07.1 (2)',
        process: 'All aircraft are equipped with a valid Certificate of Airworthiness. Originals are kept at Head Office, copies are onboard. Checked during pre-flight (Form F-001) and weekly by the Aircraft Manager.',
        responsibleManager: 'Aircraft Manager',
        lastAuditDate: '2024-06-15',
        nextAuditDate: '2025-06-15',
        findings: 'NCR-002 (Resolved)'
    },
    {
        regulation: 'CATS 139.01.1',
        process: 'Facility inspections of the hangar and apron areas are conducted weekly by the Ground Ops Manager using checklist G-CHK-003. Findings are logged in the Safety System.',
        responsibleManager: 'Ground Ops Manager',
        lastAuditDate: '2024-07-01',
        nextAuditDate: '2024-10-01',
        findings: 'None'
    }
];

// Functions to modify data are now handled by components writing to Firestore.
```
  </change>
  <change>
    <file>/src/app/quality/coherence-matrix/actions.ts</file>
    <content><![CDATA[