

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, AuditChecklistItem, User, DiscussionEntry } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, FileText, Save, Send, PlusCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { DiscussionSection } from './discussion-section';


const discussionFormSchema = z.object({
  recipient: z.string().min(1, 'You must select a recipient.'),
  message: z.string().min(1, 'Message cannot be empty.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;


export default function QualityAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const auditId = params.auditId as string;
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = React.useState(false);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!company) {
      setLoading(false);
      return;
    }
    
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const auditRef = doc(db, `companies/${company!.id}/quality-audits`, auditId);
        const auditSnap = await getDoc(auditRef);

        if (auditSnap.exists()) {
          setAudit({ ...auditSnap.data(), id: auditSnap.id } as QualityAudit);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Audit not found.' });
        }
      } catch (error) {
        console.error("Error fetching audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch audit details.' });
      } finally {
        setLoading(false);
      }
    };
    
    const fetchPersonnel = async () => {
        const personnelQuery = collection(db, `companies/${company!.id}/users`);
        const snapshot = await getDocs(personnelQuery);
        setPersonnel(snapshot.docs.map(doc => doc.data() as User));
    };

    fetchAudit();
    fetchPersonnel();
  }, [auditId, user, company, userLoading, router, toast]);
  
  const handleItemChange = (itemId: string, field: keyof AuditChecklistItem, value: any) => {
    if (!audit) return;
    const updatedItems = audit.checklistItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
    );
    handleAuditUpdate({ ...audit, checklistItems: updatedItems }, false);
  }
  
  const discussionForm = useForm<DiscussionFormValues>({
    resolver: zodResolver(discussionFormSchema),
  });
  
  const availableRecipients = React.useMemo(() => {
    if (!personnel || personnel.length === 0 || !user) {
      return [];
    }
    // Auditor and auditee should be able to discuss
    const team = [audit?.auditor, audit?.auditeeName].filter(Boolean);
    return personnel.filter(
      (p) => team.includes(p.name) && p.name !== user?.name
    );
  }, [personnel, audit, user]);


  const handleAuditUpdate = async (updatedAudit: QualityAudit, showToast = true) => {
    if (!company) return;
    setAudit(updatedAudit); // Optimistic update
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        await setDoc(auditRef, updatedAudit, { merge: true });
        if (showToast) {
            toast({ title: 'Audit Updated', description: 'Your changes have been saved.' });
        }
    } catch (error) {
        console.error("Error updating audit:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to the database.' });
    }
  };

  const handleNewDiscussionMessage = (data: DiscussionFormValues) => {
    if (!user || !audit) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: DiscussionEntry = {
        id: `d-${Date.now()}`,
        author: user.name,
        datePosted: new Date().toISOString(),
        ...data,
        replyByDate: data.replyByDate ? data.replyByDate.toISOString() : undefined,
    };
    
    const updatedAudit = {
        ...audit,
        discussion: [...(audit.discussion || []), newEntry],
    };

    handleAuditUpdate(updatedAudit, true);
    discussionForm.reset();
    setIsDiscussionDialogOpen(false);
    toast({
      title: 'Message Sent',
      description: `Your message has been sent to ${data.recipient}.`,
    });
  }

  if (loading || userLoading) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading audit details...</p>
        </main>
    );
  }

  if (!audit) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested quality audit could not be found.</p>
        </main>
    );
  }

  const getFindingInfo = (finding: FindingStatus | null) => {
    switch (finding) {
        case 'Compliant': return { icon: <CheckCircle className="h-5 w-5 text-green-600" />, variant: 'success' as const, text: 'Compliant' };
        case 'Partial': return { icon: <MinusCircle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const, text: 'Partial Compliance' };
        case 'Non-compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        case 'Not Applicable': return { icon: <Ban className="h-5 w-5 text-gray-500" />, variant: 'outline' as const, text: 'N/A' };
        default: return { icon: <ListChecks className="h-5 w-5" />, variant: 'outline' as const, text: finding || 'Not Set' };
    }
  };
  
  const getLevelInfo = (level: FindingLevel) => {
    switch (level) {
        case 'Level 1 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const };
        case 'Level 2 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-orange-600" />, variant: 'orange' as const };
        case 'Level 3 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const };
        default: return null;
    }
  };

  const findingOptions: FindingStatus[] = ['Compliant', 'Non-compliant', 'Partial', 'Observation', 'Not Applicable'];
  const levelOptions: FindingLevel[] = ['Level 1 Finding', 'Level 2 Finding', 'Level 3 Finding', 'Observation'];

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold">Audit Report</h2>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Quality Audit Report: {audit.id}</CardTitle>
                <CardDescription>
                  Detailed report for the {audit.type} audit conducted on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                </CardDescription>
              </div>
              <Badge variant="outline">{audit.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-6">
              <div>
                <p className="font-semibold text-muted-foreground">Area Audited</p>
                <p>{audit.area}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Audit Type</p>
                <p>{audit.type}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Lead Auditor</p>
                <p>{audit.auditor}</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-6">
                <h3 className="font-semibold">Audit Summary</h3>
                <Textarea 
                  placeholder="Enter the overall audit summary here..."
                  className="min-h-[100px]"
                  value={audit.summary}
                  onChange={(e) => handleAuditUpdate({ ...audit, summary: e.target.value }, false)}
                />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="checklist">Audit Checklist</TabsTrigger>
                <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>Full Audit Checklist</CardTitle>
                        <Button onClick={() => handleAuditUpdate(audit)}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Audit
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {audit.checklistItems && audit.checklistItems.length > 0 ? (
                            <div className="space-y-4">
                                {audit.checklistItems.map(item => {
                                    const findingInfo = getFindingInfo(item.finding);
                                    const levelInfo = getLevelInfo(item.level);
                                    return (
                                        <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                            <div>
                                                <p className="font-medium">{item.text}</p>
                                                {item.regulationReference && <p className="text-xs text-muted-foreground">Regulation: {item.regulationReference}</p>}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium">Finding</p>
                                                    <Select value={item.finding || ''} onValueChange={(value: FindingStatus) => handleItemChange(item.id, 'finding', value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Finding" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {findingOptions.map(opt => (
                                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium">Level</p>
                                                    <Select value={item.level || ''} onValueChange={(value: FindingLevel) => handleItemChange(item.id, 'level', value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Level" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {levelOptions.map(opt => (
                                                                <SelectItem key={opt} value={opt!}>{opt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Reference</p>
                                                <Textarea
                                                    placeholder="Document references, evidence, etc."
                                                    value={item.reference || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                                    />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Comment</p>
                                                <Textarea
                                                    placeholder="Auditor comments, observations..."
                                                    value={item.comment || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'comment', e.target.value)}
                                                    />
                                            </div>

                                            <div className="flex items-center gap-4 text-sm pt-2 border-t">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Result:</span>
                                                    <Badge variant={findingInfo.variant} className="whitespace-nowrap">
                                                        {findingInfo.icon}
                                                        <span className="ml-2">{findingInfo.text}</span>
                                                    </Badge>
                                                    {levelInfo && (
                                                        <Badge variant={levelInfo.variant} className="whitespace-nowrap">
                                                        {item.level}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground font-semibold">No checklist items were recorded for this audit.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => handleAuditUpdate(audit)} className="w-full">
                            <Save className="mr-2 h-4 w-4" />
                            Save and Finalize Audit
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="discussion">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Discussion Forum</CardTitle>
                        <Dialog open={isDiscussionDialogOpen} onOpenChange={setIsDiscussionDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Send className="mr-2 h-4 w-4" />
                                    Post Message
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Post New Message</DialogTitle>
                                    <DialogDescription>Your message will be visible to all members of the audit.</DialogDescription>
                                </DialogHeader>
                                <Form {...discussionForm}>
                                    <form onSubmit={discussionForm.handleSubmit(handleNewDiscussionMessage)} className="space-y-4">
                                    <FormField
                                        control={discussionForm.control}
                                        name="recipient"
                                        render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Send To</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Select a recipient" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableRecipients.map((p) => (
                                                <SelectItem key={p.id} value={p.name}>
                                                    {p.name}
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={discussionForm.control}
                                        name="message"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Message / Instruction</FormLabel>
                                            <FormControl>
                                            <Textarea
                                                placeholder="Type your message here..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end items-center">
                                        <Button type="submit">
                                            <Send className="mr-2 h-4 w-4" />
                                            Post Message
                                        </Button>
                                    </div>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <DiscussionSection 
                            audit={audit} 
                            onUpdate={handleAuditUpdate} 
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
  );
}
