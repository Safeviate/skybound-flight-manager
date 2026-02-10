'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert, NonConformanceIssue, CorrectiveActionPlan, Risk, SafetyObjective, AuditChecklist, User, ComplianceItem, CompanyDepartment, Aircraft, Department, ManagementOfChange, SafetyReport, GroupedRisk, Booking, CoherenceMatrixCategory, FindingStatus, FindingLevel } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, startOfMonth, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search, MoreHorizontal, Archive, Percent, RotateCw, FileText, Trash2, PlusCircle, Edit, Database, ShieldCheck, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, ArrowUpDown, ChevronDown, MinusCircle, XCircle, MessageSquareWarning, Ban, Check, CalendarIcon, Signature } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AuditSchedule } from '../quality/audit-schedule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, updateDoc, writeBatch, deleteDoc, where, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls';
import { AuditChecklistsManager } from '../quality/audit-checklists-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// --- Top Level Helper Components ---

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
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
        <Legend />
        <Line type="monotone" dataKey="score" name="Compliance Score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const NonConformanceChart = ({ data }: { data: QualityAudit[] }) => {
    const conformanceCounts: { [key: string]: number } = {};
    data.flatMap(audit => audit.nonConformanceIssues || []).forEach(issue => {
        const category = issue.regulationReference?.split(' ')[0] || 'Uncategorized';
        conformanceCounts[category] = (conformanceCounts[category] || 0) + 1;
    });
    const chartData = Object.keys(conformanceCounts).map(key => ({ name: key, count: conformanceCounts[key] }));
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="count" name="Issues" fill="hsl(var(--primary))" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const ComplianceItemForm = ({
  onSubmit,
  personnel,
  departments,
  categories,
  existingItem,
  preSelectedParentId,
}: {
  onSubmit: (data: Omit<ComplianceItem, 'id' | 'companyId'>) => void;
  personnel: User[];
  departments: CompanyDepartment[];
  categories: CoherenceMatrixCategory[];
  existingItem?: ComplianceItem | null;
  preSelectedParentId?: string;
}) => {
  const complianceItemSchema = z.object({
    parentRegulation: z.string().optional(),
    regulation: z.string().min(3, 'Regulation point is required.'),
    regulationStatement: z.string().min(5, 'Regulation statement is required.'),
    companyReference: z.string().optional(),
    responsibleManager: z.string().min(1, 'Responsible Manager is required.'),
    nextAuditDate: z.date().optional().nullable(),
  });

  type ComplianceFormValues = z.infer<typeof complianceItemSchema>;
  
  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceItemSchema),
    defaultValues: existingItem
      ? {
          ...existingItem,
          parentRegulation: existingItem.parentRegulation || 'none',
          regulationStatement: existingItem.regulationStatement || '',
          nextAuditDate: existingItem.nextAuditDate ? parseISO(existingItem.nextAuditDate) : null,
        }
      : {
          parentRegulation: preSelectedParentId || 'none',
          regulation: '',
          regulationStatement: '',
          companyReference: '',
          responsibleManager: '',
        },
  });

  const handleFormSubmit = (data: ComplianceFormValues) => {
    onSubmit({
        ...data,
        parentRegulation: data.parentRegulation === 'none' ? undefined : data.parentRegulation,
        nextAuditDate: data.nextAuditDate ? format(data.nextAuditDate, 'yyyy-MM-dd') : undefined,
    } as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="parentRegulation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top Level Regulation</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="none">None / Uncategorized</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="regulation" render={({ field }) => (<FormItem><FormLabel>Regulation Point</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="regulationStatement" render={({ field }) => (<FormItem><FormLabel>Statement</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="companyReference" render={({ field }) => (<FormItem><FormLabel>Company Reference</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="responsibleManager" render={({ field }) => (
            <FormItem>
                <FormLabel>Manager</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl>
                    <SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="nextAuditDate" render={({ field }) => (
            <FormItem>
                <FormLabel>Next Audit</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
        )} />
        <DialogFooter><Button type="submit">Save Requirement</Button></DialogFooter>
      </form>
    </Form>
  );
};

const ReportTable = ({ 
    reportList, 
    isArchivedTable = false, 
    controls, 
    handleArchiveAudit, 
    handleRestoreAudit, 
    handleDeleteAudit 
}: { 
    reportList: QualityAudit[], 
    isArchivedTable?: boolean, 
    controls: any, 
    handleArchiveAudit: (id: string) => void, 
    handleRestoreAudit: (id: string) => void, 
    handleDeleteAudit: (id: string) => void 
}) => {
    const getComplianceColor = (score: number) => {
        if (score >= 95) return 'text-green-600';
        if (score >= 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusVariant = (status: QualityAudit['status']) => {
        switch (status) {
          case 'Closed': return 'success';
          case 'Open': return 'warning';
          case 'Archived': return 'secondary';
          default: return 'outline';
        }
    };

    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof QualityAudit }) => (
        <Button variant="ghost" onClick={() => controls.requestSort(sortKey)} className="px-2 h-auto text-xs font-semibold">
            {label}
            {controls.sortConfig?.key === sortKey ? (
                <ArrowUpDown className={cn("ml-1 h-3 w-3", controls.sortConfig.direction === 'desc' && "rotate-180")} />
            ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-0" />}
        </Button>
    );

    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><SortableHeader label="Audit ID" sortKey="auditNumber" /></TableHead>
                        <TableHead><SortableHeader label="Audit Date" sortKey="date" /></TableHead>
                        <TableHead><SortableHeader label="Report Heading" sortKey="title" /></TableHead>
                        <TableHead><SortableHeader label="Auditee" sortKey="auditeeName" /></TableHead>
                        <TableHead><SortableHeader label="Audit Reference" sortKey="area" /></TableHead>
                        <TableHead><SortableHeader label="Asset" sortKey="aircraftInvolved" /></TableHead>
                        <TableHead><SortableHeader label="Type" sortKey="type" /></TableHead>
                        <TableHead><SortableHeader label="Compliance" sortKey="complianceScore" /></TableHead>
                        <TableHead><SortableHeader label="Status" sortKey="status" /></TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportList.length > 0 ? (
                        reportList.map(audit => (
                        <TableRow key={audit.id}>
                            <TableCell><Link href={`/quality/${audit.id}`} className="hover:underline">{audit.auditNumber || audit.id.substring(0, 8)}</Link></TableCell>
                            <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{audit.title}</TableCell>
                            <TableCell>{audit.auditeeName || 'N/A'}</TableCell>
                            <TableCell>{audit.area}</TableCell>
                            <TableCell>{audit.aircraftInvolved || 'N/A'}</TableCell>
                            <TableCell>{audit.type}</TableCell>
                            <TableCell>
                                <div className={`flex items-center gap-1 font-semibold ${getComplianceColor(audit.complianceScore)}`}>
                                    <Percent className="h-4 w-4" />{audit.complianceScore}%
                                </div>
                            </TableCell>
                            <TableCell><Badge variant={getStatusVariant(audit.status)}>{audit.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild><Link href={`/quality/${audit.id}`}><FileText className="mr-2 h-4 w-4" />View Report</Link></DropdownMenuItem>
                                        {isArchivedTable ? (
                                            <>
                                                <DropdownMenuItem onSelect={() => handleRestoreAudit(audit.id)}><RotateCw className="mr-2 h-4 w-4" />Restore</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Permanently</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete the audit record. This cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteAudit(audit.id)}>Yes, delete audit</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (<DropdownMenuItem onSelect={() => handleArchiveAudit(audit.id)}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>)}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (<TableRow><TableCell colSpan={10} className="text-center h-24">No audit reports found.</TableCell></TableRow>)}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
};

// --- Main Quality Page Content ---

export function QualityPageContent({
    initialAudits,
    initialSchedule,
    initialChecklists,
    initialPersonnel,
    initialDepartments,
    initialAircraft,
    initialTasks,
    initialAuditAreas,
}: {
    initialAudits: QualityAudit[],
    initialSchedule: AuditScheduleItem[],
    initialChecklists: AuditChecklist[],
    initialPersonnel: User[],
    initialDepartments: CompanyDepartment[],
    initialAircraft: Aircraft[],
    initialTasks: UnifiedTask[],
    initialAuditAreas: CompanyAuditArea[],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const { company, user, updateCompany } = useUser();
  const { toast } = useToast();

  const [audits, setAudits] = useState<QualityAudit[]>(initialAudits);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>(initialSchedule);
  const [auditAreas, setAuditAreas] = useState<CompanyAuditArea[]>(initialAuditAreas);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [categories, setCategories] = useState<CoherenceMatrixCategory[]>([]);
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<CoherenceMatrixCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [preSelectedCategoryName, setPreSelectedCategoryName] = useState<string | undefined>();

  const activeAudits = useMemo(() => audits.filter(a => a.status !== 'Archived'), [audits]);
  const archivedAudits = useMemo(() => audits.filter(a => a.status === 'Archived'), [audits]);

  const reportsControls = useTableControls(activeAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName', 'area'],
  });
  
  const archivedReportsControls = useTableControls(archivedAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName', 'area'],
  });

  const fetchData = useCallback(async () => {
    if (!company) return;
    const auditsQuery = query(collection(db, `companies/${company.id}/quality-audits`));
    const scheduleQuery = query(collection(db, `companies/${company.id}/audit-schedule-items`));
    const auditAreasQuery = query(collection(db, `companies/${company.id}/audit-areas`));
    
    const [auditsSnap, scheduleSnap, auditAreasSnap] = await Promise.all([
        getDocs(auditsQuery),
        getDocs(scheduleQuery),
        getDocs(auditAreasQuery),
    ]);
    
    setAudits(auditsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as QualityAudit)));
    setSchedule(scheduleSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditScheduleItem)));
    setAuditAreas(auditAreasSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompanyAuditArea)));
  }, [company]);

  const fetchMatrixData = useCallback(async () => {
    if (!company) return;
    try {
        const compQuery = query(collection(db, `companies/${company.id}/compliance-matrix`));
        const catQuery = query(collection(db, `companies/${company.id}/coherence-matrix-categories`));
        const [compSnap, catSnap] = await Promise.all([getDocs(compQuery), getDocs(catQuery)]);
        setComplianceItems(compSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComplianceItem)));
        setCategories(catSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CoherenceMatrixCategory)));
    } catch (e) { console.error(e); }
  }, [company]);

  useEffect(() => { 
    fetchData();
    fetchMatrixData(); 
  }, [fetchData, fetchMatrixData]);

  const groupedMatrix = useMemo(() => {
    const grouped: Record<string, ComplianceItem[]> = {};
    categories.forEach(cat => { grouped[cat.name] = []; });
    complianceItems.forEach(item => {
        const parent = item.parentRegulation || 'Other / Uncategorized';
        if (!grouped[parent]) grouped[parent] = [];
        grouped[parent].push(item);
    });
    return grouped;
  }, [complianceItems, categories]);

  const handleMatrixSubmit = async (data: Omit<ComplianceItem, 'id' | 'companyId'>) => {
    if (!company) return;
    try {
        if (editingItem) {
            await updateDoc(doc(db, `companies/${company.id}/compliance-matrix`, editingItem.id), data);
            toast({ title: 'Requirement Updated' });
        } else {
            await addDoc(collection(db, `companies/${company.id}/compliance-matrix`), { ...data, companyId: company.id });
            toast({ title: 'Requirement Added' });
        }
        setIsComplianceDialogOpen(false); setEditingItem(null); setPreSelectedCategoryName(undefined);
        fetchMatrixData();
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const handleCategorySubmit = async () => {
    if (!company || !newCategoryName.trim()) return;
    try {
        if (editingCategory) {
            const batch = writeBatch(db);
            const oldName = editingCategory.name;
            const newName = newCategoryName.trim();
            batch.update(doc(db, `companies/${company.id}/coherence-matrix-categories`, editingCategory.id), { name: newName });
            complianceItems.forEach(item => {
                if (item.parentRegulation === oldName) {
                    batch.update(doc(db, `companies/${company.id}/compliance-matrix`, item.id), { parentRegulation: newName });
                }
            });
            await batch.commit();
            toast({ title: 'Category Renamed' });
        } else {
            await addDoc(collection(db, `companies/${company.id}/coherence-matrix-categories`), { name: newCategoryName.trim() });
            toast({ title: 'Category Created' });
        }
        setIsCategoryDialogOpen(false); setEditingCategory(null); setNewCategoryName('');
        fetchMatrixData();
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const handleArchiveAudit = async (id: string) => {
    if (!company) return;
    await updateDoc(doc(db, `companies/${company.id}/quality-audits`, id), { status: 'Archived' });
    setAudits(prev => prev.map(a => a.id === id ? { ...a, status: 'Archived' } : a));
    toast({ title: 'Audit Archived' });
  };

  const handleRestoreAudit = async (id: string) => {
    if (!company) return;
    await updateDoc(doc(db, `companies/${company.id}/quality-audits`, id), { status: 'Closed' });
    setAudits(prev => prev.map(a => a.id === id ? { ...a, status: 'Closed' } : a));
    toast({ title: 'Audit Restored' });
  };

  const handleDeleteAudit = async (id: string) => {
    if (!company) return;
    await deleteDoc(doc(db, `companies/${company.id}/quality-audits`, id));
    setAudits(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Audit Deleted' });
  };

  const canEdit = user?.permissions.includes('Quality:Edit') || user?.permissions.includes('Super User');

  const groupAuditsByDept = (list: QualityAudit[]) => {
    return list.reduce((acc, audit) => {
      const dept = audit.department || 'Uncategorized';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(audit);
      return acc;
    }, {} as Record<string, QualityAudit[]>);
  };

  const groupedActive = useMemo(() => groupAuditsByDept(reportsControls.items), [reportsControls.items]);
  const groupedArchived = useMemo(() => groupAuditsByDept(archivedReportsControls.items), [archivedReportsControls.items]);

  return (
    <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 no-print">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="audits">Audits</TabsTrigger>
                <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
                <TabsTrigger value="task-tracker">Task Tracker</TabsTrigger>
                <TabsTrigger value="coherence-matrix">Coherence Matrix</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
                <Card>
                    <CardHeader><CardTitle>Audit Schedule</CardTitle></CardHeader>
                    <CardContent>
                        <AuditSchedule 
                            auditAreas={auditAreas} 
                            schedule={schedule} 
                            onUpdate={async (item) => { 
                                if (!company) return; 
                                await setDoc(doc(db, `companies/${company.id}/audit-schedule-items`, item.id), item, { merge: true }); 
                                fetchData(); 
                            }} 
                            onAreaUpdate={async (id, name) => { 
                                if (!company) return; 
                                await updateDoc(doc(db, `companies/${company.id}/audit-areas`, id), { name }); 
                                fetchData(); 
                            }} 
                            onAreaAdd={async () => { 
                                if (!company) return; 
                                await addDoc(collection(db, `companies/${company.id}/audit-areas`), { name: 'New Area' }); 
                                fetchData(); 
                            }} 
                            onAreaDelete={async (id) => { 
                                if (!company) return; 
                                await deleteDoc(doc(db, `companies/${company.id}/audit-areas`, id)); 
                                fetchData(); 
                            }} 
                        />
                    </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card><CardHeader><CardTitle>Compliance Score</CardTitle></CardHeader><CardContent><ComplianceChart data={activeAudits} /></CardContent></Card>
                    <Card><CardHeader><CardTitle>Non-Conformance Breakdown</CardTitle></CardHeader><CardContent><NonConformanceChart data={activeAudits} /></CardContent></Card>
                </div>
            </TabsContent>

            <TabsContent value="audits" className="space-y-8">
                <Card>
                    <CardHeader><CardTitle>Active Audit Reports</CardTitle></CardHeader>
                    <CardContent>
                        {Object.keys(groupedActive).sort().map(dept => (
                            <div key={dept} className="mb-8">
                                <h3 className="font-semibold mb-2">{dept}</h3>
                                <ReportTable 
                                    reportList={groupedActive[dept]} 
                                    controls={reportsControls} 
                                    handleArchiveAudit={handleArchiveAudit} 
                                    handleRestoreAudit={() => {}} 
                                    handleDeleteAudit={handleDeleteAudit} 
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Archived Audit Reports</CardTitle></CardHeader>
                    <CardContent>
                        {Object.keys(groupedArchived).sort().map(dept => (
                            <div key={dept} className="mb-8">
                                <h3 className="font-semibold mb-2">{dept}</h3>
                                <ReportTable 
                                    reportList={groupedArchived[dept]} 
                                    isArchivedTable 
                                    controls={archivedReportsControls} 
                                    handleArchiveAudit={() => {}} 
                                    handleRestoreAudit={handleRestoreAudit} 
                                    handleDeleteAudit={handleDeleteAudit} 
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="checklists">
                <AuditChecklistsManager 
                    initialTemplates={initialChecklists} 
                    initialPersonnel={initialPersonnel} 
                    initialDepartments={initialDepartments} 
                    initialAircraft={initialAircraft} 
                />
            </TabsContent>

            <TabsContent value="task-tracker">
                <TaskTrackerPageContent initialTasks={initialTasks} personnel={initialPersonnel} />
            </TabsContent>

            <TabsContent value="coherence-matrix">
                <Card>
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                            <CardTitle>Coherence Matrix</CardTitle>
                            <CardDescription>Regulatory compliance and oversight register.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {canEdit && (
                                <>
                                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Top Level
                                    </Button>
                                    <Button onClick={() => setIsComplianceDialogOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-Regulation
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Headers row above Top Level Regulations */}
                        <div className="grid grid-cols-[15%_30%_15%_15%_15%_10%] px-4 py-2 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <div>Regulation</div>
                            <div>Statement</div>
                            <div>Co. Ref.</div>
                            <div>Manager</div>
                            <div>Next Audit</div>
                            <div className="text-right">Actions</div>
                        </div>

                        <Accordion type="multiple" className="w-full">
                            {Object.keys(groupedMatrix).sort().map(catName => (
                                <AccordionItem key={catName} value={catName}>
                                    <AccordionTrigger className="px-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2"><Badge variant="outline">{catName}</Badge></div>
                                            {canEdit && catName !== 'Other / Uncategorized' && (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { 
                                                        setEditingCategory(categories.find(c => c.name === catName)!); 
                                                        setNewCategoryName(catName); 
                                                        setIsCategoryDialogOpen(true); 
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={async () => { 
                                                        if (!company) return; 
                                                        const catId = categories.find(c => c.name === catName)?.id; 
                                                        if (catId) await deleteDoc(doc(db, `companies/${company.id}/coherence-matrix-categories`, catId)); 
                                                        fetchMatrixData(); 
                                                    }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-1">
                                            {groupedMatrix[catName].map(item => (
                                                <div key={item.id} className="grid grid-cols-[15%_30%_15%_15%_15%_10%] px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors text-sm items-center">
                                                    <div className="font-semibold">{item.regulation}</div>
                                                    <div className="pr-4 line-clamp-2" title={item.regulationStatement}>{item.regulationStatement}</div>
                                                    <div className="pr-4 truncate" title={item.companyReference}>{item.companyReference || 'N/A'}</div>
                                                    <div>{item.responsibleManager}</div>
                                                    <div>{item.nextAuditDate || 'N/A'}</div>
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setIsComplianceDialogOpen(true); }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { 
                                                            if (!company) return; 
                                                            await deleteDoc(doc(db, `companies/${company.id}/compliance-matrix`, item.id)); 
                                                            fetchMatrixData(); 
                                                        }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {groupedMatrix[catName].length === 0 && (
                                                <div className="px-4 py-8 text-center text-muted-foreground italic">No requirements in this category.</div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <Dialog open={isComplianceDialogOpen} onOpenChange={setIsComplianceDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>{editingItem ? 'Edit' : 'Add'} Compliance Requirement</DialogTitle></DialogHeader>
                <ComplianceItemForm 
                    onSubmit={handleMatrixSubmit} 
                    personnel={initialPersonnel} 
                    departments={initialDepartments} 
                    categories={categories} 
                    existingItem={editingItem} 
                    preSelectedParentId={preSelectedCategoryName} 
                />
            </DialogContent>
        </Dialog>
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingCategory ? 'Rename' : 'Add'} Top Level Regulation</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Regulation Name</Label>
                        <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Enter regulation title..." />
                    </div>
                    <DialogFooter><Button onClick={handleCategorySubmit}>{editingCategory ? 'Save Changes' : 'Add'}</Button></DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    </main>
  );
}
