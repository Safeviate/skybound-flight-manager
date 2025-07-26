

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, AuditChecklistItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, FileText, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


export default function QualityAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const auditId = params.auditId as string;

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

    fetchAudit();
  }, [auditId, user, company, userLoading, router, toast]);
  
  const handleItemChange = (itemId: string, field: keyof AuditChecklistItem, value: any) => {
    if (!audit) return;
    const updatedItems = audit.checklistItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
    );
    setAudit({ ...audit, checklistItems: updatedItems });
  }

  const handleSaveAudit = async () => {
    if (!audit || !company) return;
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, audit.id);
        await updateDoc(auditRef, { checklistItems: audit.checklistItems, summary: audit.summary });
        toast({ title: 'Audit Saved', description: 'Your changes have been successfully saved.' });
    } catch (error) {
        console.error("Error saving audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save audit to the database.' });
    }
  };

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
                  onChange={(e) => setAudit({ ...audit, summary: e.target.value })}
                />
            </div>
          </CardContent>
        </Card>

        {audit.nonConformanceIssues.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Non-Conformance Issues</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Placeholder for non-conformance issues */}
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Full Audit Checklist</CardTitle>
                <Button onClick={handleSaveAudit}>
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
                                        {item.regulationReference && <p className="text-xs text-muted-foreground">Ref: {item.regulationReference}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                        <div className="lg:col-span-2 space-y-2">
                                            <p className="text-sm font-medium">Evidence / Observation Notes</p>
                                            <Textarea 
                                                placeholder="Record evidence or observation details..."
                                                value={item.evidence || ''}
                                                onChange={(e) => handleItemChange(item.id, 'evidence', e.target.value)}
                                            />
                                        </div>
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
                <Button onClick={handleSaveAudit} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save and Finalize Audit
                </Button>
            </CardFooter>
        </Card>
      </main>
  );
}
