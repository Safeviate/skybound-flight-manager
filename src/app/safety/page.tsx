

'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, MapPin, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { safetyReportData as initialSafetyReports } from '@/lib/mock-data';
import { riskRegisterData as initialRisks } from '@/lib/mock-data';
import type { SafetyReport, Risk, RiskStatus, GroupedRisk } from '@/lib/types';
import { getRiskScore, getRiskScoreColor, getExpiryBadge } from '@/lib/utils.tsx';
import { NewSafetyReportForm } from './new-safety-report-form';
import { RiskAssessmentTool } from './risk-assessment-tool';
import { useUser } from '@/context/user-provider';
import { format } from 'date-fns';
import Link from 'next/link';
import { NewRiskForm } from './new-risk-form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

function groupRisksByArea(risks: Risk[]): GroupedRisk[] {
  const grouped: { [key: string]: Risk[] } = risks.reduce((acc, risk) => {
    const area = risk.hazardArea;
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(risk);
    return acc;
  }, {} as { [key: string]: Risk[] });

  return Object.keys(grouped).map(area => ({
    area,
    risks: grouped[area],
  }));
}


export default function SafetyPage() {
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(initialSafetyReports);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [isNewRiskOpen, setIsNewRiskOpen] = useState(false);
  const { user } = useUser();

  const groupedRiskData = groupRisksByArea(risks);

  const getStatusVariant = (status: SafetyReport['status']) => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'Under Review': return 'warning';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  };
  
  const handleNewReportSubmit = (newReportData: Omit<SafetyReport, 'id' | 'submittedBy' | 'status' | 'filedDate'> & { isAnonymous?: boolean }) => {
    const { isAnonymous, ...reportData } = newReportData;
    const newReport: SafetyReport = {
        id: `sr-${Date.now()}`,
        submittedBy: isAnonymous ? 'Anonymous' : (user?.name || 'System'),
        status: 'Open',
        filedDate: format(new Date(), 'yyyy-MM-dd'),
        ...reportData,
    };
    setSafetyReports(prev => [newReport, ...prev]);
    setIsNewReportOpen(false);
  };
  
  const handleNewRiskSubmit = (newRiskData: Omit<Risk, 'id' | 'dateIdentified' | 'riskScore'>) => {
    const newRisk: Risk = {
      ...newRiskData,
      id: `risk-reg-${Date.now()}`,
      dateIdentified: format(new Date(), 'yyyy-MM-dd'),
      riskScore: getRiskScore(newRiskData.likelihood, newRiskData.severity),
    };
    setRisks(prev => [newRisk, ...prev]);
    setIsNewRiskOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Safety Management System" />
      <main className="flex-1 p-4 md:p-8">
        <Tabs defaultValue="reports">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="reports">Safety Reports</TabsTrigger>
              <TabsTrigger value="register">Risk Register</TabsTrigger>
              <TabsTrigger value="assessment">Risk Assessment Tool</TabsTrigger>
            </TabsList>
            <Dialog open={isNewReportOpen} onOpenChange={setIsNewReportOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  File New Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>File New Safety Report</DialogTitle>
                  <DialogDescription>
                    Describe the incident or hazard. This will be reviewed by the Safety Manager.
                  </DialogDescription>
                </DialogHeader>
                <NewSafetyReportForm safetyReports={safetyReports} onSubmit={handleNewReportSubmit} />
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Filed Safety Reports</CardTitle>
                <CardDescription>Incidents and hazards reported by personnel.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Occurrence Date</TableHead>
                      <TableHead>Filed Date</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safetyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono">
                           <Link href={`/safety/${report.id}`} className="hover:underline">
                                {report.reportNumber}
                           </Link>
                        </TableCell>
                        <TableCell>{report.occurrenceDate}</TableCell>
                        <TableCell>{report.filedDate}</TableCell>
                        <TableCell>{report.submittedBy}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-col">
                            <span className="font-medium truncate">{report.heading}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {report.subCategory && (
                                    <Badge variant="secondary" className="w-fit">
                                        {report.subCategory}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-muted-foreground truncate">{report.details}</span>
                          </div>
                        </TableCell>
                        <TableCell>{report.aircraftInvolved || 'N/A'}</TableCell>
                        <TableCell>
                          {report.location && (
                              <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {report.location}
                              </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
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
                                <Link href={`/safety/${report.id}`}>
                                    View & Investigate
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>Update Status</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Risk Register</CardTitle>
                    <CardDescription>A log of identified risks and their mitigation status.</CardDescription>
                </div>
                 <Dialog open={isNewRiskOpen} onOpenChange={setIsNewRiskOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Risk Assessment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>New Risk Assessment</DialogTitle>
                            <DialogDescription>
                                Proactively add a new risk to the central register.
                            </DialogDescription>
                        </DialogHeader>
                        <NewRiskForm onSubmit={handleNewRiskSubmit} />
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {groupedRiskData.map(group => (
                    <div key={group.area} className="border rounded-lg">
                      <div className="bg-muted p-3 border-b">
                         <h3 className="font-semibold text-lg">{group.area}</h3>
                      </div>
                      <ScrollArea>
                        <div className="min-w-[1800px]">
                           <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[5%]">No.</TableHead>
                                    <TableHead className="w-[15%]">Hazard</TableHead>
                                    <TableHead className="w-[15%]">Risk</TableHead>
                                    <TableHead className="w-[15%]">Exposure</TableHead>
                                    <TableHead className="w-[10%]">Initial Risk</TableHead>
                                    <TableHead className="w-[15%]">Existing Mitigation</TableHead>
                                    <TableHead className="w-[15%]">Proposed Mitigation</TableHead>
                                    <TableHead className="w-[10%]">Mitigated Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {group.risks.map((risk, index) => (
                                    <TableRow key={risk.id}>
                                        <TableCell>{String(index + 1).padStart(3, '0')}</TableCell>
                                        <TableCell>{risk.hazard}</TableCell>
                                        <TableCell>{risk.risk}</TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside">
                                                {risk.consequences.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </TableCell>
                                        <TableCell>
                                            <Badge style={{backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white'}} className="rounded-md">
                                                {risk.riskScore}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{risk.existingMitigation}</TableCell>
                                        <TableCell>{risk.proposedMitigation}</TableCell>
                                        <TableCell>
                                            {risk.residualRiskScore !== undefined ? (
                                                <Badge style={{backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white'}} className="rounded-md">
                                                    {risk.residualRiskScore}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                           </Table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  ))}
                   {groupedRiskData.length === 0 && (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No risks have been added to the register yet.</p>
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessment">
            <RiskAssessmentTool />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
