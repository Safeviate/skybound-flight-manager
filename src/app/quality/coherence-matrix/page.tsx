
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
import { collection, query, getDocs, addDoc, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { PlusCircle, Edit, Save, Trash2, ArrowLeft, Database } from 'lucide-react';
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
import { complianceData as seedComplianceData } from '@/lib/data-provider';


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
        seedComplianceData.forEach(item => {
            const docRef = doc(collection(db, `companies/${company.id}/compliance-matrix`));
            batch.set(docRef, {...item, companyId: company.id});
        });
        await batch.commit();
        fetchData();
        toast({title: 'Sample Data Seeded', description: 'The coherence matrix has been populated with Part 141 regulations.'})
    };

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
