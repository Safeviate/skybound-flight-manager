
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QualityAuditAnalyzer } from './quality-audit-analyzer';
import { AuditSchedule } from './audit-schedule';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuditChecklistsPage from './audit-checklists/page';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
        conformanceCounts[issue.category] = (conformanceCounts[issue.category] || 0) + 1;
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
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);
  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, company, loading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (company) {
        const fetchData = async () => {
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
        fetchData();
    }
  }, [user, company, loading, router, toast]);


  const getStatusVariant = (status: QualityAudit['status']) => {
    switch (status) {
      case 'Compliant': return 'success';
      case 'With Findings': return 'warning';
      case 'Non-Compliant': return 'destructive';
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
    // This part is tricky without a dedicated 'areas' collection.
    // For now, we update local state. A real app might have a collection for audit areas.
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
  
  const handleAuditSubmit = async (newAuditData: Omit<QualityAudit, 'id'>) => {
    if (!company) return;
    try {
        const docRef = await addDoc(collection(db, `companies/${company.id}/quality-audits`), newAuditData);
        setAudits(prevAudits => [{ ...newAuditData, id: docRef.id }, ...prevAudits]);
        setActiveTab('audits');
    } catch (error) {
        console.error("Error submitting audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit audit.' });
    }
  };

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }


  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
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
                        <CardTitle>Recent Quality Audits</CardTitle>
                        <CardDescription>A log of recently completed internal and external audits.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Audit ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Area</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {audits.map(audit => (
                                    <TableRow key={audit.id} onClick={() => router.push(`/quality/${audit.id}`)} className="cursor-pointer">
                                        <TableCell className="font-mono">{audit.id}</TableCell>
                                        <TableCell>{format(parseISO(audit.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{audit.type}</TableCell>
                                        <TableCell>{audit.area}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(audit.status)}>{audit.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{audit.complianceScore}%</TableCell>
                                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="checklists" className="mt-4">
                <AuditChecklistsPage onAuditSubmit={handleAuditSubmit} />
            </TabsContent>
        </Tabs>
      </main>
  );
}

QualityPage.title = 'Quality Assurance';
QualityPage.headerContent = (
    <Dialog>
        <DialogTrigger asChild>
            <Button>
                <Bot className="mr-2 h-4 w-4" />
                AI Audit Analysis
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <QualityAuditAnalyzer />
        </DialogContent>
    </Dialog>
);
export default QualityPage;
