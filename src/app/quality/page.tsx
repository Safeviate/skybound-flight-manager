
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { qualityAuditData as initialAuditData, auditScheduleData as initialScheduleData } from '@/lib/mock-data';
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

export default function QualityPage() {
  const [audits, setAudits] = useState<QualityAudit[]>(initialAuditData);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>(initialScheduleData);
  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusVariant = (status: QualityAudit['status']) => {
    switch (status) {
      case 'Compliant': return 'success';
      case 'With Findings': return 'warning';
      case 'Non-Compliant': return 'destructive';
      default: return 'outline';
    }
  };
  
  const handleScheduleUpdate = (updatedItem: AuditScheduleItem) => {
    setSchedule(prevSchedule => {
      const existingItem = prevSchedule.find(item => item.id === updatedItem.id);
      if (existingItem) {
        return prevSchedule.map(item => item.id === updatedItem.id ? updatedItem : item);
      } else {
        return [...prevSchedule, updatedItem];
      }
    });
  };

  const handleAreaUpdate = (index: number, newName: string) => {
    const oldName = auditAreas[index];
    setAuditAreas(prevAreas => {
        const newAreas = [...prevAreas];
        newAreas[index] = newName;
        return newAreas;
    });
    // Also update schedule items that used the old name
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
    // Remove schedule items associated with the deleted area
    setSchedule(prevSchedule => prevSchedule.filter(item => item.area !== areaToDelete));
  };
  
  const handleAuditSubmit = (newAudit: QualityAudit) => {
    setAudits(prevAudits => [newAudit, ...prevAudits]);
    setActiveTab('audits');
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Quality Assurance">
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
      </Header>
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
    </div>
  );
}
