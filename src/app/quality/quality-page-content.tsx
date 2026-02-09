
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, User, ComplianceItem, CompanyDepartment, Aircraft, Department, UnifiedTask, CompanyAuditArea, CoherenceMatrixCategory, FindingStatus, FindingLevel, AuditChecklistItem } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, isAfter, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent, RotateCw, FileText, Trash2, PlusCircle, Edit, ArrowLeft, TrendingUp, AlertTriangle, Clock, MapPin, ArrowUpDown, ChevronDown, CheckCircle, MinusCircle, XCircle, MessageSquareWarning, Ban, Check, CalendarIcon, Signature } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskTrackerPageContent } from '@/app/task-tracker/task-tracker-page-content';

const getFindingInfo = (finding: FindingStatus | null) => {
    switch (finding) {
        case 'Compliant': return { icon: <CheckCircle className="h-5 w-5 text-green-600" />, variant: 'success' as const, text: 'Compliant' };
        case 'Partial': return { icon: <MinusCircle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const, text: 'Partial Compliance' };
        case 'Non Compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        case 'Not Applicable': return { icon: <Ban className="h-5 w-5 text-gray-500" />, variant: 'outline' as const, text: 'N/A' };
        default: return { icon: <ListChecks className="h-5 w-5" />, variant: 'outline' as const, text: 'Not Set' };
    }
};

const getLevelInfo = (level: FindingLevel) => {
    switch (level) {
        case 'Level 1 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const };
        case 'Level 2 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-orange-600" />, variant: 'orange' as const };
        case 'Level 3 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const };
        default: return null;
    }
};

const levelOptions: FindingLevel[] = ['Level 1 Finding', 'Level 2 Finding', 'Level 3 Finding', 'Observation'];

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
  const [departmentFilter, setDepartmentFilter] = useState('');

  const complianceItemSchema = z.object({
    parentRegulation: z.string().min(1, 'Parent Regulation is required.'),
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
          parentRegulation: preSelectedParentId || '',
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
    if (!departmentFilter || departmentFilter === 'all') {
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
              <FormLabel>Top Level Regulation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select parent regulation" /></SelectTrigger></FormControl>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <p className="text-sm font-medium">Filter by Department</p>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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

const CoherenceMatrix = ({ audits: initialAudits, personnel: initialPersonnel, departments: initialDepartments }: { audits: QualityAudit[], personnel: User[], departments: CompanyDepartment[] }) => {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
    const [categories, setCategories] = useState<CoherenceMatrixCategory[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [preSelectedCategoryName, setPreSelectedCategoryName] = useState<string | undefined>();
    const [editingCategory, setEditingCategory] = useState<CoherenceMatrixCategory | null>(null);

    const fetchData = useCallback(async () => {
        if (!company) return;
        try {
            const complianceQuery = query(collection(db, `companies/${company.id}/compliance-matrix`));
            const complianceSnapshot = await getDocs(complianceQuery);
            setComplianceItems(complianceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComplianceItem)));
            
            const categoriesQuery = query(collection(db, `companies/${company.id}/coherence-matrix-categories`));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            setCategories(categoriesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CoherenceMatrixCategory)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load coherence matrix data.' });
        }
    }, [company, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const getAuditDataForRegulation = (regulation: string) => {
        const relevantAudits = initialAudits.filter(audit =>
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
            setPreSelectedCategoryName(undefined);
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save item.' });
        }
    };
    
    const handleCategorySubmit = async () => {
        if (!company || !newCategoryName.trim()) return;
        try {
            if (editingCategory) {
                const batch = writeBatch(db);
                const catRef = doc(db, `companies/${company.id}/coherence-matrix-categories`, editingCategory.id);
                batch.update(catRef, { name: newCategoryName.trim() });

                const oldName = editingCategory.name;
                const newName = newCategoryName.trim();
                complianceItems.forEach(item => {
                    if (item.parentRegulation === oldName) {
                        const itemRef = doc(db, `companies/${company.id}/compliance-matrix`, item.id);
                        batch.update(itemRef, { parentRegulation: newName });
                    }
                });

                await batch.commit();
                toast({ title: 'Top Level Regulation Updated' });
            } else {
                await addDoc(collection(db, `companies/${company.id}/coherence-matrix-categories`), { name: newCategoryName.trim() });
                toast({ title: 'Top Level Regulation Added' });
            }
            setNewCategoryName('');
            setEditingCategory(null);
            setIsCategoryDialogOpen(false);
            fetchData();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save category.' });
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/coherence-matrix-categories`, catId));
            toast({ title: 'Category Deleted' });
            fetchData();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete category.' });
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
    
    const groupedItems = useMemo(() => {
        const grouped: Record<string, ComplianceItem[]> = {};
        categories.forEach(cat => { grouped[cat.name] = []; });
        complianceItems.forEach(item => {
            const parent = item.parentRegulation || 'Other / Uncategorized';
            if (!grouped[parent]) grouped[parent] = [];
            grouped[parent].push(item);
        });
        return grouped;
    }, [complianceItems, categories]);

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>Coherence Matrix</CardTitle>
                    <CardDescription>applicable regulatory requirements and compliance processes.</CardDescription>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <>
                            <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) { setEditingCategory(null); setNewCategoryName(''); } }}>
                                <DialogTrigger asChild><Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Top Level</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>{editingCategory ? 'Rename' : 'Add'} Top Level Regulation</DialogTitle></DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Regulation Name</Label>
                                            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Enter regulation title..." />
                                        </div>
                                        <DialogFooter><Button onClick={handleCategorySubmit}>{editingCategory ? 'Save Changes' : 'Add Category'}</Button></DialogFooter>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={() => { setPreSelectedCategoryName(undefined); setEditingItem(null); setIsDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Sub-Regulation</Button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[1fr,2fr,1fr] p-4 font-semibold border-b bg-muted/30">
                        <div>Regulation / Section</div><div>Regulation Statement</div><div className="text-right">Next Audit</div>
                    </div>
                    {Object.keys(groupedItems).length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {Object.keys(groupedItems).sort().map(parentReg => (
                                <AccordionItem value={parentReg} key={parentReg} className="border-b last:border-b-0">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2"><Badge variant="outline" className="font-bold text-sm">{parentReg}</Badge><span className="text-xs text-muted-foreground">({groupedItems[parentReg].length} items)</span></div>
                                            {canEdit && (
                                                <div className="flex items-center gap-2 no-print" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" variant="ghost" onClick={() => { setPreSelectedCategoryName(parentReg); setEditingItem(null); setIsDialogOpen(true); }}><PlusCircle className="h-4 w-4 mr-1" /> Add Requirement</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => { const cat = categories.find(c => c.name === parentReg); if(cat){ setEditingCategory(cat); setNewCategoryName(cat.name); setIsCategoryDialogOpen(true); } }} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete Top Level Regulation?</AlertDialogTitle><AlertDialogDescription>This will remove "{parentReg}". Items will be moved to "Uncategorized".</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { const cat = categories.find(c => c.name === parentReg); if (cat) handleDeleteCategory(cat.id); }} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                        <div className="divide-y bg-muted/5">
                                            {groupedItems[parentReg].length > 0 ? groupedItems[parentReg].map(item => {
                                                const { lastAuditDate, findings } = getAuditDataForRegulation(item.regulation);
                                                return (
                                                    <Collapsible key={item.id} className="w-full">
                                                        <CollapsibleTrigger className="w-full">
                                                            <div className="grid grid-cols-[1fr,2fr,1fr] p-4 text-left hover:bg-muted/50 transition-colors">
                                                                <div className="font-semibold text-primary">{item.regulation}</div><div className="truncate pr-4 text-sm">{item.regulationStatement}</div><div className="text-right flex items-center justify-end gap-2 text-sm">{item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}<ChevronDown className="h-4 w-4" /></div>
                                                            </div>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <div className="px-8 py-4 bg-background border-t space-y-4 shadow-inner">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-4">
                                                                        <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Regulation Statement</h4><p className="text-sm whitespace-pre-wrap leading-relaxed">{item.regulationStatement}</p></div>
                                                                        <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company Reference</h4><p className="text-sm whitespace-pre-wrap leading-relaxed">{item.companyReference || 'N/A'}</p></div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Manager</h4><p className="text-sm font-medium">{item.responsibleManager}</p></div>
                                                                            <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Audit</h4><p className="text-sm">{lastAuditDate}</p></div>
                                                                            <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Next Audit</h4><p className="text-sm">{item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'dd MMM yyyy') : 'N/A'}</p></div>
                                                                            <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Findings</h4><Badge variant={findings === 'None' ? 'success' : 'destructive'} className="text-[10px] uppercase">{findings}</Badge></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {canEdit && (
                                                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                                                        <Button variant="outline" size="sm" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-white"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive">Yes, Delete</AlertDialogAction></AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                )
                                            }) : (<div className="p-4 text-center text-xs text-muted-foreground italic">No items.</div>)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (<div className="p-10 text-center text-sm text-muted-foreground">No regulations added yet.</div>)}
                </div>
            </CardContent>
            {canEdit && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader><DialogTitle>{editingItem ? 'Edit' : 'Add'} Compliance Requirement</DialogTitle></DialogHeader>
                        <ComplianceItemForm onSubmit={handleFormSubmit} personnel={initialPersonnel} departments={initialDepartments} categories={categories} existingItem={editingItem} preSelectedParentId={preSelectedCategoryName} />
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
};

const ComplianceChart = ({ data }: { data: QualityAudit[] }) => {
  const chartData = data.map(audit => ({ date: format(parseISO(audit.date), 'MMM yy'), score: audit.complianceScore, })).reverse();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[80, 100]} unit="%" /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', }} /><Legend /><Line type="monotone" dataKey="score" name="Compliance Score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
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
    const chartData = Object.keys(conformanceCounts).map(key => ({ name: key, count: conformanceCounts[key], }));
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} /><Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', }} /><Legend /><Bar dataKey="count" name="Issues" fill="hsl(var(--primary))" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const groupAuditsByDepartment = (reportList: QualityAudit[]) => {
  return reportList.reduce((acc, audit) => {
    const dept = audit.department || 'Uncategorized';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(audit);
    return acc;
  }, {} as Record<string, QualityAudit[]>);
};

interface ReportTableProps {
    audits: QualityAudit[];
    isArchivedTable: boolean;
    controls: any;
    selectedAudits: string[];
    handleSelectAll: (checked: boolean, controls: any) => void;
    handleSelectOne: (auditId: string, checked: boolean) => void;
    handleRestoreAudit: (id: string) => void;
    handleArchiveAudit: (id: string) => void;
    handleDeleteAudit: (id: string) => void;
    getComplianceColor: (score: number) => string;
    getStatusVariant: (status: any) => any;
}

const ReportTable = ({ 
    audits: reportList, 
    isArchivedTable = false, 
    controls, 
    selectedAudits, 
    handleSelectAll, 
    handleSelectOne, 
    handleRestoreAudit, 
    handleArchiveAudit, 
    handleDeleteAudit, 
    getComplianceColor, 
    getStatusVariant 
}: ReportTableProps) => {
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                    {isArchivedTable && (
                        <TableHead className="w-12">
                            <Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked), controls)} checked={selectedAudits.length > 0 && selectedAudits.length === controls.items.length} />
                        </TableHead>
                    )}
                    <TableHead>Audit ID</TableHead><TableHead>Audit Date</TableHead><TableHead>Report Heading</TableHead><TableHead>Auditee</TableHead><TableHead>Audit Reference</TableHead><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Compliance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportList.length > 0 ? (
                        reportList.map(audit => (
                        <TableRow key={audit.id} data-state={selectedAudits.includes(audit.id) && "selected"}>
                            {isArchivedTable && (<TableCell><Checkbox checked={selectedAudits.includes(audit.id)} onCheckedChange={(checked) => handleSelectOne(audit.id, !!checked)} /></TableCell>)}
                            <TableCell><Link href={`/quality/${audit.id}`} className="hover:underline">{audit.auditNumber || audit.id.substring(0, 8)}</Link></TableCell>
                            <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell><TableCell>{audit.title}</TableCell><TableCell>{audit.auditeeName || 'N/A'}</TableCell><TableCell>{audit.area}</TableCell><TableCell>{audit.aircraftInvolved || 'N/A'}</TableCell><TableCell>{audit.type}</TableCell><TableCell><div className={`flex items-center gap-1 font-semibold ${getComplianceColor(audit.complianceScore)}`}><Percent className="h-4 w-4" />{audit.complianceScore}%</div></TableCell><TableCell><Badge variant={getStatusVariant(audit.status)}>{audit.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem asChild><Link href={`/quality/${audit.id}`}><FileText className="mr-2 h-4 w-4" />View Report</Link></DropdownMenuItem>
                                        {isArchivedTable ? (
                                            <><DropdownMenuItem onSelect={() => handleRestoreAudit(audit.id)}><RotateCw className="mr-2 h-4 w-4" />Restore</DropdownMenuItem><DropdownMenuSeparator /><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Permanently</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the audit.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAudit(audit.id)}>Yes, delete audit</AlertDialogAction></AlertDialogFooter></AlertDialog></>
                                        ) : (<DropdownMenuItem onSelect={() => handleArchiveAudit(audit.id)}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>)}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (<TableRow><TableCell colSpan={isArchivedTable ? 11 : 10} className="text-center h-24">No audit reports found.</TableCell></TableRow>)}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
};

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
  
  const fetchData = useCallback(async () => {
    if (!company) return;
    const data = await getDocs(collection(db, `companies/${company.id}/quality-audits`));
    setAudits(data.docs.map(doc => ({ ...doc.data(), id: doc.id } as QualityAudit)));
    
    const scheduleData = await getDocs(collection(db, `companies/${company.id}/audit-schedule-items`));
    setSchedule(scheduleData.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditScheduleItem)));
    
    const areasData = await getDocs(collection(db, `companies/${company.id}/audit-areas`));
    setAuditAreas(areasData.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompanyAuditArea)));
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
    setSchedule(prev => {
        const idx = prev.findIndex(item => item.id === updatedItem.id);
        if (idx > -1) { const next = [...prev]; next[idx] = updatedItem; return next; }
        return [...prev, updatedItem];
    });
    try {
        const scheduleRef = doc(db, `companies/${company.id}/audit-schedule-items`, updatedItem.id);
        await setDoc(scheduleRef, updatedItem, { merge: true });
    } catch(error) {
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
        const batch = writeBatch(db);
        schedule.forEach(item => { if (item.area === oldArea.name) batch.update(doc(db, `companies/${company.id}/audit-schedule-items`, item.id), { area: newName }); });
        await batch.commit();
        fetchData();
        toast({ title: "Audit Area Updated" });
    } catch(e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const handleAreaAdd = async () => {
    if (!company) return;
    try {
        await addDoc(collection(db, `companies/${company.id}/audit-areas`), { name: `New Area ${auditAreas.length + 1}` });
        fetchData(); toast({ title: "Audit Area Added" });
    } catch(e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const handleAreaDelete = async (areaId: string) => {
    if (!company) return;
    const area = auditAreas.find(a => a.id === areaId);
    if (!area) return;
    try {
        const batch = writeBatch(db);
        batch.delete(doc(db, `companies/${company.id}/audit-areas`, areaId));
        schedule.forEach(item => { if (item.area === area.name) batch.delete(doc(db, `companies/${company.id}/audit-schedule-items`, item.id)); });
        await batch.commit();
        fetchData(); toast({ title: "Audit Area Deleted" });
    } catch(e) { toast({ variant: 'destructive', title: 'Error' }); }
  };
  
  const handleArchiveAudit = async (auditId: string) => {
    if (!company) return;
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, `companies/${company.id}/quality-audits`, auditId), { status: 'Archived' });
        const alertsSnap = await getDocs(query(collection(db, `companies/${company.id}/alerts`), where("relatedLink", "==", `/quality/${auditId}`)));
        alertsSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: 'Archived' } : a));
        toast({ title: 'Audit Archived' });
    } catch (error) { toast({ variant: 'destructive', title: 'Error' }); }
  };
  
  const handleRestoreAudit = async (auditId: string) => {
    if (!company) return;
    try {
        await updateDoc(doc(db, `companies/${company.id}/quality-audits`, auditId), { status: 'Closed' });
        setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: 'Closed' } : a));
        toast({ title: 'Audit Restored' });
    } catch (error) { toast({ variant: 'destructive', title: 'Error' }); }
  };
  
  const handleBulkRestore = async () => {
    if (!company || selectedAudits.length === 0) return;
    const batch = writeBatch(db);
    selectedAudits.forEach(id => batch.update(doc(db, `companies/${company.id}/quality-audits`, id), { status: 'Closed' }));
    try {
        await batch.commit();
        setAudits(prev => prev.map(a => selectedAudits.includes(a.id) ? { ...a, status: 'Closed' } : a));
        setSelectedAudits([]);
        toast({ title: 'Audits Restored' });
    } catch (error) { toast({ variant: 'destructive', title: 'Error' }); }
  };
  
  const handleSelectAll = (checked: boolean, controls: any) => {
    if (checked) setSelectedAudits(controls.items.map((a: any) => a.id));
    else setSelectedAudits([]);
  }

  const handleSelectOne = (auditId: string, checked: boolean) => {
    if (checked) setSelectedAudits(prev => [...prev, auditId]);
    else setSelectedAudits(prev => prev.filter(id => id !== auditId));
  }

  const handleDeleteAudit = async (auditId: string) => {
    if (!company) return;
    try {
      await deleteDoc(doc(db, `companies/${company.id}/quality-audits`, auditId));
      setAudits(prev => prev.filter(a => a.id !== auditId));
      toast({ title: 'Audit Deleted' });
    } catch (error) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const groupedActiveAudits = useMemo(() => groupAuditsByDepartment(reportsControls.items), [reportsControls.items]);
  const groupedArchivedAudits = useMemo(() => groupAuditsByDepartment(archivedReportsControls.items), [archivedReportsControls.items]);

  return (
      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 no-print">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger><TabsTrigger value="audits">Audits</TabsTrigger><TabsTrigger value="checklists">Audit Checklists</TabsTrigger><TabsTrigger value="task-tracker">Task Tracker</TabsTrigger><TabsTrigger value="coherence-matrix">Coherence Matrix</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          <TabsContent value="dashboard" className="space-y-8 mt-4">
               <Card><CardHeader><CardTitle>Annual Audit Schedule</CardTitle><CardDescription>Plan and track internal and external audits.</CardDescription></CardHeader><CardContent><AuditSchedule auditAreas={auditAreas} schedule={schedule} onUpdate={handleScheduleUpdate} onAreaUpdate={handleAreaUpdate} onAreaAdd={handleAreaAdd} onAreaDelete={handleAreaDelete} /></CardContent></Card>
              <div className="grid gap-8 md:grid-cols-2">
                  <Card><CardHeader><CardTitle>Compliance Score Over Time</CardTitle></CardHeader><CardContent><ComplianceChart data={activeAudits} /></CardContent></Card>
                  <Card><CardHeader><CardTitle>Non-Conformance Categories</CardTitle></CardHeader><CardContent><NonConformanceChart data={activeAudits} /></CardContent></Card>
              </div>
          </TabsContent>
          <TabsContent value="audits" className="mt-4">
              <Card>
                  <CardHeader><CardTitle>Audit Reports</CardTitle><CardDescription>Review all quality audit reports.</CardDescription></CardHeader>
                  <CardContent>
                    <Tabs defaultValue="active">
                        <TabsList><TabsTrigger value="active" onClick={() => setShowArchived(false)}>Active Audits</TabsTrigger><TabsTrigger value="archived" onClick={() => setShowArchived(true)}>Archived Audits</TabsTrigger></TabsList>
                         <div className="flex items-center py-4">
                            <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audits..." value={showArchived ? archivedReportsControls.searchTerm : reportsControls.searchTerm} onChange={(e) => showArchived ? archivedReportsControls.setSearchTerm(e.target.value) : reportsControls.setSearchTerm(e.target.value)} className="pl-10" /></div>
                        </div>
                        <TabsContent value="active" className="mt-4 space-y-8">
                             {Object.keys(groupedActiveAudits).sort().map(department => (
                                <div key={department}>
                                    <h3 className="text-lg font-semibold mb-2">{department}</h3>
                                    <ReportTable 
                                        audits={groupedActiveAudits[department]} 
                                        isArchivedTable={false} 
                                        controls={reportsControls}
                                        selectedAudits={selectedAudits}
                                        handleSelectAll={handleSelectAll}
                                        handleSelectOne={handleSelectOne}
                                        handleRestoreAudit={handleRestoreAudit}
                                        handleArchiveAudit={handleArchiveAudit}
                                        handleDeleteAudit={handleDeleteAudit}
                                        getComplianceColor={getComplianceColor}
                                        getStatusVariant={getStatusVariant}
                                    />
                                </div>
                            ))}
                        </TabsContent>
                         <TabsContent value="archived" className="mt-4 space-y-8">
                            <div className="flex justify-end mb-4">{selectedAudits.length > 0 && (<Button variant="outline" onClick={handleBulkRestore}><RotateCw className="mr-2 h-4 w-4" />Restore Selected ({selectedAudits.length})</Button>)}</div>
                            {Object.keys(groupedArchivedAudits).sort().map(department => (
                                <div key={department}>
                                    <h3 className="text-lg font-semibold mb-2">{department}</h3>
                                    <ReportTable 
                                        audits={groupedArchivedAudits[department]} 
                                        isArchivedTable={true} 
                                        controls={archivedReportsControls}
                                        selectedAudits={selectedAudits}
                                        handleSelectAll={handleSelectAll}
                                        handleSelectOne={handleSelectOne}
                                        handleRestoreAudit={handleRestoreAudit}
                                        handleArchiveAudit={handleArchiveAudit}
                                        handleDeleteAudit={handleDeleteAudit}
                                        getComplianceColor={getComplianceColor}
                                        getStatusVariant={getStatusVariant}
                                    />
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                  </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="checklists" className="mt-4">
              <AuditChecklistsManager initialTemplates={initialChecklists} initialPersonnel={initialPersonnel} initialDepartments={initialDepartments} initialAircraft={initialAircraft} />
          </TabsContent>
          <TabsContent value="task-tracker" className="mt-4">
            <TaskTrackerPageContent initialTasks={initialTasks} personnel={initialPersonnel} />
          </TabsContent>
          <TabsContent value="coherence-matrix" className="mt-4">
            <CoherenceMatrix audits={audits} personnel={initialPersonnel} departments={initialDepartments} />
          </TabsContent>
        </Tabs>
      </main>
  );
}
