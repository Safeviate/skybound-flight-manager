

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent } from 'lucide-react';
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

const INITIAL_AUDIT_AREAS = ['Flight Operations', 'Maintenance', 'Ground Ops', 'Management', 'Safety Systems', 'External (FAA)'];

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

  const filteredAudits = activeAudits.filter(audit => {
    const searchLower = searchTerm.toLowerCase();
    return (
        audit.id.toLowerCase().includes(searchLower) ||
        audit.area.toLowerCase().includes(searchLower) ||
        audit.auditor.toLowerCase().includes(searchLower) ||
        audit.status.toLowerCase().includes(searchLower) ||
        audit.type.toLowerCase().includes(searchLower)
    );
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
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="audits">Audits</TabsTrigger>
                <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
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
                            <ComplianceChart data={audits} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Non-Conformance Categories</CardTitle>
                            <CardDescription>Frequency of different types of non-conformance issues.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NonConformanceChart data={audits} />
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
                        <div className="flex items-center py-4">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                placeholder="Search audits..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                                />
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Audit ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Area</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Compliance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAudits.length > 0 ? (
                                    filteredAudits.map(audit => (
                                    <TableRow key={audit.id}>
                                        <TableCell className="font-mono">
                                        <Link href={`/quality/${audit.id}`} className="hover:underline">
                                            {audit.id.substring(0, 8)}...
                                        </Link>
                                        </TableCell>
                                        <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{audit.area}</TableCell>
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
                                                    <DropdownMenuItem onSelect={() => handleArchiveAudit(audit.id)}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Archive
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24">
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
        </Tabs>
      </main>
  );
}

QualityPage.title = 'Quality Assurance';
export default QualityPage;
