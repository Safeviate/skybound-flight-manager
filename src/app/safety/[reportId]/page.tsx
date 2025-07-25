
'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SafetyReport } from '@/lib/types';
import { ArrowLeft, Mail, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getStatusVariant = (status: SafetyReport['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Closed': return 'success';
    default: return 'outline';
  }
};

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
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded-md">
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
                    <TabsList>
                        <TabsTrigger value="triage">Triage & Classification</TabsTrigger>
                        <TabsTrigger value="investigation">Investigation</TabsTrigger>
                        <TabsTrigger value="risk-mitigation">Risk Mitigation</TabsTrigger>
                        <TabsTrigger value="corrective-action">Corrective Action</TabsTrigger>
                        <TabsTrigger value="final-review">Final Review</TabsTrigger>
                    </TabsList>
                    <TabsContent value="triage" className="mt-4">
                        {/* Content for Triage & Classification will go here */}
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

      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;
