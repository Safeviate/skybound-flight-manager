
'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Risk, SafetyReport } from '@/lib/types';
import { ArrowLeft, Mail, Printer, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvestigationTeamForm } from './investigation-team-form';
import { InitialRiskAssessment } from './initial-risk-assessment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ICAO_OCCURRENCE_CATEGORIES } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { ICAO_CODE_DEFINITIONS } from '@/lib/icao-codes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

const getStatusVariant = (status: SafetyReport['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Closed': return 'success';
    default: return 'outline';
  }
};

const ICAO_OPTIONS = ICAO_OCCURRENCE_CATEGORIES.map(code => ({ 
    value: code, 
    label: code,
    description: ICAO_CODE_DEFINITIONS[code] || 'No definition available.'
}));

function SafetyReportInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading } = useUser();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    
    async function fetchReport() {
        if (!company || !reportId) return;
        setDataLoading(true);
        try {
            const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
            const reportSnap = await getDoc(reportRef);

            if (reportSnap.exists()) {
                const reportData = reportSnap.data() as SafetyReport;
                setReport(reportData);
            } else {
                console.error("No such document!");
                setReport(null);
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch safety report.' });
        } finally {
            setDataLoading(false);
        }
    }
    
    fetchReport();
  }, [reportId, company, user, loading, router, toast]);

  const handleReportUpdate = async (updatedReport: SafetyReport, showToast = true) => {
    if (!company) return;
    setReport(updatedReport); // Optimistic update
    try {
        const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
        await setDoc(reportRef, updatedReport, { merge: true });
        if (showToast) {
            toast({ title: 'Report Updated', description: 'Your changes have been saved.' });
        }
    } catch (error) {
        console.error("Error updating report:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to the database.' });
        // Optionally revert state here
    }
  };

  const handlePromoteRisk = async (newRisk: Risk) => {
    if (!company) return;
    try {
        const riskRef = doc(db, `companies/${company.id}/risks`, newRisk.id);
        await setDoc(riskRef, newRisk);
    } catch (error) {
        console.error("Error promoting risk:", error);
        toast({ variant: 'destructive', title: 'Promotion Failed', description: 'Could not save risk to the central register.' });
    }
  };

  if (loading || dataLoading) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading report...</p>
        </main>
    );
  }

  if (!report) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested safety report could not be found.</p>
        </main>
    );
  }
  
  const generateMailtoLink = () => {
    if (!report) return "";

    const subject = `Safety Report: ${report.reportNumber} - ${report.heading}`;
    let body = `A safety report requires your attention.\n\n`;
    body += `Report Number: ${report.reportNumber}\n`;
    body += `Heading: ${report.heading}\n`;
    body += `Status: ${report.status}\n`;
    body += `Date of Occurrence: ${report.occurrenceDate}\n\n`;
    body += `Details:\n${report.details}\n\n`;
    body += `Link to report: ${window.location.href}`;

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const headerContent = (
    <>
        <Button asChild variant="outline" className="no-print">
            <Link href="/safety?tab=reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Reports
            </Link>
        </Button>
        <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.print()} className="no-print">
                <Printer className="mr-2 h-4 w-4" />
                Print Report
            </Button>
            <a href={generateMailtoLink()}>
                 <Button variant="outline" className="no-print">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Report
                </Button>
            </a>
        </div>
    </>
  );

  return (
    <>
      <main className="flex-1 p-4 md:p-8">
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                            <CardTitle className="mt-2">{report.reportNumber}: {report.heading}</CardTitle>
                            <CardDescription>
                                Occurrence on {report.occurrenceDate} at {report.occurrenceTime || 'N/A'}. Filed by {report.submittedBy} on {report.filedDate}.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Details of Occurrence</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                        {report.details}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Investigation Workflow</CardTitle>
                    <CardDescription>
                        Follow these steps to conduct a thorough investigation of the safety report.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="triage">
                        <TabsList className="grid w-full grid-cols-5 h-auto">
                            <TabsTrigger value="triage">Triage & Classification</TabsTrigger>
                            <TabsTrigger value="investigation" disabled>Investigation</TabsTrigger>
                            <TabsTrigger value="risk-mitigation" disabled>Risk Mitigation</TabsTrigger>
                            <TabsTrigger value="corrective-action" disabled>Corrective Action</TabsTrigger>
                            <TabsTrigger value="final-review" disabled>Final Review</TabsTrigger>
                        </TabsList>
                        <TabsContent value="triage" className="mt-4 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Report Status</label>
                                    <Select 
                                        value={report.status} 
                                        onValueChange={(value: SafetyReport['status']) => handleReportUpdate({ ...report, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Set status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="Under Review">Under Review</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                        ICAO Occurrence Category
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>ICAO Occurrence Categories</DialogTitle>
                                                    <DialogDescription>
                                                        Standardized categories for aviation occurrences based on the ICAO ADREP taxonomy.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <ScrollArea className="h-96">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Code</TableHead>
                                                                <TableHead>Definition</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {ICAO_OPTIONS.map(option => (
                                                                <TableRow key={option.value}>
                                                                    <TableCell className="font-mono">{option.label}</TableCell>
                                                                    <TableCell>{option.description}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </DialogContent>
                                        </Dialog>
                                    </label>
                                    <Combobox
                                        options={ICAO_OPTIONS}
                                        value={report.occurrenceCategory || ''}
                                        onChange={(value) => handleReportUpdate({ ...report, occurrenceCategory: value }, false)}
                                        placeholder="Select ICAO category..."
                                        searchPlaceholder="Search categories..."
                                        noResultsText="No category found."
                                    />
                                </div>
                            </div>
                            <InvestigationTeamForm report={report} onUpdate={handleReportUpdate} />
                            <InitialRiskAssessment report={report} onUpdate={handleReportUpdate} onPromoteRisk={handlePromoteRisk}/>
                        </TabsContent>
                        <TabsContent value="investigation" className="mt-4">
                            {/* Content for Investigation will go here */}
                        </TabsContent>
                         <TabsContent value="risk-mitigation" className="mt-4">
                            {/* Content for Risk Mitigation will go here */}
                        </TabsContent>
                         <TabsContent value="corrective-action" className="mt-4">
                            {/* Content for Corrective Action will go here */}
                        </TabsContent>
                         <TabsContent value="final-review" className="mt-4">
                            {/* Content for Final Review will go here */}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;
