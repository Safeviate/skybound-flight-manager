
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert, NonConformanceIssue, CorrectiveActionPlan, Risk, SafetyObjective, AuditChecklist, User, ComplianceItem, CompanyDepartment, Aircraft, Department, ManagementOfChange, SafetyReport, GroupedRisk, Booking, UnifiedTask, CompanyAuditArea } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, startOfMonth, differenceInDays, isAfter } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent, RotateCw, FileText, Trash2, PlusCircle, Edit, Database, ShieldCheck, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuditSchedule } from '../quality/audit-schedule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, updateDoc, writeBatch, deleteDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls.ts';
import { AuditChecklistsManager } from '../quality/audit-checklists-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { EditSpiForm, type SpiConfig } from '@/app/safety/edit-spi-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { TaskTrackerPageContent } from '@/app/task-tracker/task-tracker-page-content';
import { getQualityPageData } from './data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const ComplianceItemForm = ({
  onSubmit,
  personnel,
  departments,
  existingItem
}: {
  onSubmit: (data: Omit<ComplianceItem, 'id' | 'companyId'>) => void;
  personnel: User[];
  departments: CompanyDepartment[];
  existingItem?: ComplianceItem | null;
}) => {
  const [departmentFilter, setDepartmentFilter] = useState('');

  const complianceItemSchema = z.object({
    parentRegulation: z.string().min(2, 'Parent Regulation (e.g. SA-CATS 141) is required.'),
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
          regulationStatement: existingItem.regulationStatement || '',
          nextAuditDate: existingItem.nextAuditDate ? parseISO(existingItem.nextAuditDate) : null,
        }
      : {
          parentRegulation: '',
          regulation: '',
          regulationStatement: '',
          companyReference: '',
          responsibleManager: '',
        },
  });

  const handleFormSubmit = (data: ComplianceFormValues) => {
    onSubmit({
        ...data,
        nextAuditDate: data.nextAuditDate ? format(data.nextAuditDate, 'yyyy-MM-dd') : undefined,
    } as any);
  };
  
  const filteredPersonnel = useMemo(() => {
    const eligiblePersonnel = personnel.filter(p => p.role !== 'Student' && p.role !== 'Hire and Fly');
    if (!departmentFilter) {
        return eligiblePersonnel;
    }
    return eligiblePersonnel.filter(p => p.department === departmentFilter);
  }, [personnel, departmentFilter]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="parentRegulation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Regulation (e.g., SA-CATS 141)</FormLabel>
              <FormControl><Input placeholder="e.g., SA-CATS 141 Aviation Training Organisations" {...field} /></FormControl>
              <FormDescription>This will be used to group sub-regulations.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="regulation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-regulation / Point (e.g., 141.02.3)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="regulationStatement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regulation Statement</FormLabel>
              <FormControl><Textarea placeholder="Describe the regulation statement..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Reference</FormLabel>
              <FormControl><Textarea placeholder="Reference to company procedure, manual section, etc." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="space-y-2">
            <Label>Filter by Department</Label>
            <Select value={departmentFilter} onValueChange={(value) => setDepartmentFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <FormField
          control={form.control}
          name="responsibleManager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsible Manager</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl>
                <SelectContent>
                  {filteredPersonnel.map(p => (
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
                                <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
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


const CoherenceMatrix = ({ audits: initialAudits, personnel: initialPersonnel, departments: initialDepartments }: { audits: QualityAudit[], personnel: User[], departments: CompanyDepartment[] }) => {
    const { company, user, loading } = useUser();
    const { toast } = useToast();
    const [complianceItems, setComplianceItems] = React.useState<ComplianceItem[]>([]);
    const [personnel, setPersonnel] = React.useState<User[]>(initialPersonnel);
    const [departments, setDepartments] = React.useState<CompanyDepartment[]>(initialDepartments);
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
        setDepartments(initialDepartments);
    }, [initialAudits, initialPersonnel, initialDepartments]);

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
            .map(issue => issue.itemText)
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
            batch.set(docRef, {...itemToSeed, regulationStatement: item.process, companyId: company.id});
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

    const groupedItems = useMemo(() => {
        return complianceItems.reduce((acc, item) => {
            const parent = item.parentRegulation || 'Other / Uncategorized';
            if (!acc[parent]) acc[parent] = [];
            acc[parent].push(item);
            return acc;
        }, {} as Record<string, ComplianceItem[]>);
    }, [complianceItems]);

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
                                    <ComplianceItemForm onSubmit={handleFormSubmit} personnel={personnel} departments={departments} existingItem={editingItem} />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[1fr,2fr,1fr] p-4 font-semibold border-b bg-muted/30">
                        <div>Regulation / Section</div>
                        <div>Regulation Statement</div>
                        <div className="text-right">Next Audit</div>
                    </div>
                    
                    {Object.keys(groupedItems).length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {Object.keys(groupedItems).sort().map(parentReg => (
                                <AccordionItem value={parentReg} key={parentReg} className="border-b last:border-b-0">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-bold">{parentReg}</Badge>
                                            <span className="text-xs text-muted-foreground">({groupedItems[parentReg].length} items)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                        <div className="divide-y bg-muted/5">
                                            {groupedItems[parentReg].map(item => {
                                                const { lastAuditDate, findings } = getAuditDataForRegulation(item.regulation);
                                                return (
                                                    <Collapsible key={item.id} className="w-full">
                                                        <CollapsibleTrigger className="w-full">
                                                            <div className="grid grid-cols-[1fr,2fr,1fr] p-4 text-left hover:bg-muted/50 transition-colors">
                                                                <div className="font-semibold text-primary">{item.regulation}</div>
                                                                <div className="truncate pr-4 text-sm">{item.regulationStatement}</div>
                                                                <div className="text-right flex items-center justify-end gap-2 text-sm">
                                                                    {item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}
                                                                    <ChevronDown className="h-4 w-4" />
                                                                </div>
                                                            </div>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <div className="px-8 py-4 bg-background border-t space-y-4 shadow-inner">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Regulation Statement</h4>
                                                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.regulationStatement}</p>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company Reference</h4>
                                                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.companyReference || 'N/A'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Responsible Manager</h4>
                                                                                <p className="text-sm font-medium">{item.responsibleManager}</p>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Audit</h4>
                                                                                <p className="text-sm">{lastAuditDate}</p>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Next Audit</h4>
                                                                                <p className="text-sm">{item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Findings</h4>
                                                                                <Badge variant={findings === 'None' ? 'success' : 'destructive'} className="text-[10px] uppercase">{findings}</Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {canEdit && (
                                                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                                                        <Button variant="outline" size="sm" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                                        </Button>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-white">
                                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>This will permanently delete this compliance entry. This action cannot be undone.</AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive">Yes, Delete</AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                )
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="p-10 text-center text-sm text-muted-foreground">
                            No compliance items have been added yet. Use the button above to add your first regulation mapping.
                        </div>
                    )}
                </div>
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab');

  const [audits, setAudits] = useState<QualityAudit[]>(initialAudits);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>(initialSchedule);
  const [auditAreas, setAuditAreas] = useState<CompanyAuditArea[]>(initialAuditAreas);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const { user, company, loading } = useUser();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);
  
  const fetchData = React.useCallback(async () => {
    if (!company) return;
    const { auditsList, scheduleList, checklistsList, personnelList, departmentsList, aircraftList, unifiedTasks, auditAreasList } = await getQualityPageData(company.id);
    setAudits(auditsList);
    setSchedule(scheduleList);
    setAuditAreas(auditAreasList);
  }, [company]);

  useEffect(() => {
    setAudits(initialAudits);
    setSchedule(initialSchedule);
    setAuditAreas(initialAuditAreas);
  }, [initialAudits, initialSchedule, initialAuditAreas]);

  const activeAudits = useMemo(() => audits.filter(audit => audit.status !== 'Archived'), [audits]);
  const archivedAudits = useMemo(() => audits.filter(audit => audit.status === 'Archived'), [audits]);
  
  const reportsControls = useTableControls(activeAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName', 'area'],
  });
  
  const archivedReportsControls = useTableControls(archivedAudits, {
    initialSort: { key: 'date', direction: 'desc' },
    searchKeys: ['auditNumber', 'title', 'auditor', 'status', 'type', 'department', 'auditeeName', 'area'],
  });
  
  const handleAuditUpdate = (updatedData: Partial<QualityAudit>) => {
    if (!updatedData.id) return;
    setAudits(prev => prev.map(a => a.id === updatedData.id ? { ...a, ...updatedData } : a));
  };


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

  const handleAreaUpdate = async (areaId: string, newName: string) => {
    if (!company) return;
    const oldArea = auditAreas.find(a => a.id === areaId);
    if (!oldArea || oldArea.name === newName) return;

    try {
        const docRef = doc(db, `companies/${company.id}/audit-areas`, areaId);
        await updateDoc(docRef, { name: newName });

        // Update schedule items with the new name
        const scheduleBatch = writeBatch(db);
        schedule.forEach(item => {
            if (item.area === oldArea.name) {
                const scheduleRef = doc(db, `companies/${company.id}/audit-schedule-items`, item.id);
                scheduleBatch.update(scheduleRef, { area: newName });
            }
        });
        await scheduleBatch.commit();
        
        fetchData();
        toast({ title: "Audit Area Updated" });
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update audit area.' });
    }
  };

  const handleAreaAdd = async () => {
    if (!company) return;
    const newAreaName = `New Area ${auditAreas.length + 1}`;
    try {
        await addDoc(collection(db, `companies/${company.id}/audit-areas`), { name: newAreaName });
        fetchData();
        toast({ title: "Audit Area Added" });
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add new audit area.' });
    }
  };

  const handleAreaDelete = async (areaId: string) => {
    if (!company) return;
    const areaToDelete = auditAreas.find(a => a.id === areaId);
    if (!areaToDelete) return;

    try {
        const batch = writeBatch(db);
        const docRef = doc(db, `companies/${company.id}/audit-areas`, areaId);
        batch.delete(docRef);

        schedule.forEach(item => {
            if (item.area === areaToDelete.name) {
                const scheduleRef = doc(db, `companies/${company.id}/audit-schedule-items`, item.id);
                batch.delete(scheduleRef);
            }
        });

        await batch.commit();
        fetchData();
        toast({ title: "Audit Area Deleted" });
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete audit area.' });
    }
  };
  
  const handleArchiveAudit = async (auditId: string) => {
    if (!company) return;
    
    try {
        const batch = writeBatch(db);
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        batch.update(auditRef, { status: 'Archived' });
        
        const alertsRef = collection(db, `companies/${company.id}/alerts`);
        const alertsQuery = query(alertsRef, where("relatedLink", "==", `/quality/${auditId}`));
        const alertsSnapshot = await getDocs(alertsQuery);
        alertsSnapshot.forEach(alertDoc => {
            batch.delete(alertDoc.ref);
        });
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


  const ReportTable = ({ audits: reportList, isArchivedTable = false }: { audits: QualityAudit[], isArchivedTable?: boolean }) => {
    
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                    {isArchivedTable && (
                        <TableHead className="w-12">
                            <Checkbox 
                                onCheckedChange={(checked) => handleSelectAll(Boolean(checked), isArchivedTable ? archivedReportsControls : reportsControls)}
                                checked={selectedAudits.length > 0 && selectedAudits.length === (isArchivedTable ? archivedReportsControls.items.length : reportsControls.items.length)}
                                aria-label="Select all"
                            />
                        </TableHead>
                    )}
                    <TableHead>Audit ID</TableHead>
                    <TableHead>Audit Date</TableHead>
                    <TableHead>Report Heading</TableHead>
                    <TableHead>Auditee</TableHead>
                    <TableHead>Audit Reference</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportList.length > 0 ? (
                        reportList.map(audit => (
                        <TableRow key={audit.id} data-state={selectedAudits.includes(audit.id) && "selected"}>
                            {isArchivedTable && (
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
                                        <DropdownMenuItem asChild>
                                             <Link href={`/quality/${audit.id}`}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                View Report
                                            </Link>
                                        </DropdownMenuItem>
                                        {isArchivedTable ? (
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
                            <TableCell colSpan={isArchivedTable ? 11 : 10} className="text-center h-24">
                                No audit reports found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
  };


  return (
      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 no-print">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="audits">Audits</TabsTrigger>
                    <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
                    <TabsTrigger value="task-tracker">Task Tracker</TabsTrigger>
                    <TabsTrigger value="coherence-matrix">Coherence Matrix</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
                                    <ReportTable audits={groupedActiveAudits[department]} isArchivedTable={false} />
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
                                    <ReportTable audits={groupedArchivedAudits[department]} isArchivedTable={true} />
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
          <TabsContent value="task-tracker" className="mt-4">
            <TaskTrackerPageContent 
                initialTasks={initialTasks}
                personnel={initialPersonnel}
            />
          </TabsContent>
          <TabsContent value="coherence-matrix" className="mt-4">
            <ScrollArea className="w-full whitespace-nowrap">
              <CoherenceMatrix audits={audits} personnel={initialPersonnel} departments={initialDepartments} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
  );
}
