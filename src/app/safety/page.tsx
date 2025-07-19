
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
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
import type { SafetyReport, Risk, RiskStatus } from '@/lib/types';
import { getRiskScoreColor } from '@/lib/utils.tsx';
import { NewSafetyReportForm } from './new-safety-report-form';
import { RiskAssessmentTool } from './risk-assessment-tool';

export default function SafetyPage() {
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(initialSafetyReports);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);

  const getStatusVariant = (status: SafetyReport['status']) => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'Under Review': return 'warning';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  };
  
  const getRiskStatusVariant = (status: RiskStatus) => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'Mitigated': return 'warning';
      case 'Closed': return 'success';
      default: return 'outline';
    }
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
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  File New Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>File New Safety Report</DialogTitle>
                  <DialogDescription>
                    Describe the incident or hazard. This will be reviewed by the Safety Manager.
                  </DialogDescription>
                </DialogHeader>
                <NewSafetyReportForm />
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
                      <TableHead>Date</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safetyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>{report.submittedBy}</TableCell>
                        <TableCell>
                          <Badge variant={report.type === 'Incident' ? 'destructive' : 'secondary'}>{report.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{report.details}</TableCell>
                        <TableCell>{report.aircraftInvolved}</TableCell>
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
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
              <CardHeader>
                <CardTitle>Risk Register</CardTitle>
                <CardDescription>A log of identified risks and their mitigation status.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identified</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Likelihood</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell>{risk.dateIdentified}</TableCell>
                        <TableCell className="font-medium">{risk.description}</TableCell>
                        <TableCell>{risk.likelihood}</TableCell>
                        <TableCell>{risk.severity}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                            {risk.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getRiskStatusVariant(risk.status)}>{risk.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
