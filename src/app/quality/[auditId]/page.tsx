

'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, CorrectiveActionPlan } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, User, ShieldCheck, Calendar, BookOpen, UserCheck, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function QualityAuditDetailPage({ params }: { params: { auditId: string } }) {
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);

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
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, params.auditId);
        const auditSnap = await getDoc(auditRef);

        if (auditSnap.exists()) {
          setAudit(auditSnap.data() as QualityAudit);
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
  }, [params.auditId, user, company, userLoading, router, toast]);

  if (loading || userLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Loading Audit..." />
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading audit details...</p>
        </main>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Audit Not Found" />
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested quality audit could not be found.</p>
        </main>
      </div>
    );
  }
  
  const getStatusVariant = (status: QualityAudit['status']) => {
    switch (status) {
      case 'Compliant': return 'success';
      case 'With Findings': return 'warning';
      case 'Non-Compliant': return 'destructive';
      default: return 'outline';
    }
  };

  const getFindingInfo = (finding: FindingStatus) => {
    switch (finding) {
        case 'Partial': return { icon: <MinusCircle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const, text: 'Partial Compliance' };
        case 'Non-compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        default: return { icon: <ListChecks className="h-5 w-5" />, variant: 'outline' as const, text: finding };
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

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`Audit Details: ${audit.id}`} />
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Quality Audit Report: {audit.id}</CardTitle>
                <CardDescription>
                  Detailed report for the {audit.type} audit conducted on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(audit.status)} className="text-base">
                {audit.status}
              </Badge>
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
               <div>
                <p className="font-semibold text-muted-foreground">Auditee</p>
                <p>{audit.auditeeName} ({audit.auditeePosition})</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-6">
                <h3 className="font-semibold">Audit Summary</h3>
                <p className="text-muted-foreground p-3 bg-muted rounded-md">{audit.summary}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Audit Findings & Corrective Actions
                </CardTitle>
                <CardDescription>
                    The following issues, observations, and corrective action plans were identified during the audit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {audit.nonConformanceIssues.length > 0 ? (
                    <div className="space-y-6">
                        {audit.nonConformanceIssues.map((issue, index) => {
                             const findingInfo = getFindingInfo(issue.finding);
                             const levelInfo = getLevelInfo(issue.level);
                             const cap = issue.correctiveActionPlan;
                             return (
                                <div key={issue.id} className="p-4 border rounded-lg">
                                    <div className="flex items-start gap-3">
                                        {findingInfo.icon}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-base flex items-center gap-2">Finding #{index + 1}: 
                                                    <Badge variant={findingInfo.variant}>{findingInfo.text}</Badge>
                                                    {levelInfo && <Badge variant={levelInfo.variant}>{issue.level}</Badge>}
                                                </h4>
                                                <Badge variant="outline">{issue.category}</Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1">{issue.description}</p>
                                            <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">Regulation:</span> {issue.regulationReference || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {cap && (
                                        <div className="mt-4 pt-4 border-t space-y-4">
                                            <h5 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/> Corrective Action Plan</h5>
                                            <div className="space-y-2 text-sm p-3 bg-muted rounded-md">
                                                <p><span className="font-semibold">Root Cause:</span> {cap.rootCause}</p>
                                                <p><span className="font-semibold">Corrective Action:</span> {cap.correctiveAction}</p>
                                                <p><span className="font-semibold">Preventative Action:</span> {cap.preventativeAction}</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground"/> <span>{cap.responsiblePerson}</span></div>
                                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> <span>Due: {format(parseISO(cap.completionDate), 'MMM d, yyyy')}</span></div>
                                                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground"/> <Badge variant="outline">{cap.status}</Badge></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                         <CheckCircle className="h-10 w-10 text-success mb-2" />
                        <p className="text-muted-foreground font-semibold">No non-conformance issues were identified.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
