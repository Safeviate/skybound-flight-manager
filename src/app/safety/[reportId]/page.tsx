
'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Risk, SafetyReport } from '@/lib/types';
import { ArrowLeft, Mail, Printer, Info, Wind, Bird } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InvestigationStepsGenerator } from './investigation-steps-generator';
import { FiveWhysGenerator } from './five-whys-generator';
import { MitigatedRiskAssessment } from './mitigated-risk-assessment';
import { CorrectiveActionPlanGenerator } from './corrective-action-plan-generator';
import { FinalReview } from './final-review';
import { DiscussionSection } from './discussion-section';

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

const CLASSIFICATION_OPTIONS = ['Hazard', 'Occurrence', 'Incident', 'Accident'];

const SCF_SUBCATEGORIES = ['Landing Gear', 'Flight Controls', 'Hydraulics', 'Electrical', 'Avionics', 'Navigation', 'Other'];
const LOS_SUBCATEGORIES = ['Close Proximity', 'Traffic Advisory (TA)', 'Resolution Advisory (RA)'];
const RA_CALLOUTS = ['Climb', 'Descend', 'Maintain Vertical Speed', 'Level Off', 'Increase Climb', 'Increase Descent', 'Climb, Crossing Climb', 'Descend, Crossing Descend'];
const WEATHER_RELATED_CATEGORIES = ['WSTRW', 'TURB', 'ICE', 'CFIT', 'LOC-I', 'RI', 'RE', 'LALT', 'UIMC'];

const BIRD_STRIKE_PARTS = ['Radome', 'Windshield', 'Nose', 'Engine No. 1', 'Engine No. 2', 'Propeller', 'Wing/Rotor', 'Fuselage', 'Landing Gear', 'Tail', 'Lights', 'Other'];
const BIRD_NUMBERS = ['1', '2-10', '11-100', 'More than 100'];
const BIRD_SIZES = ['Small', 'Medium', 'Large'];


const WeatherInputGroup = ({ report, onUpdate }: { report: SafetyReport, onUpdate: (updatedReport: SafetyReport, showToast?: boolean) => void }) => {
  return (
    <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
      <label className="text-sm font-medium block flex items-center gap-2">
        <Wind className="h-4 w-4" />
        Weather Information
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input 
          placeholder="Visibility (e.g., 5 SM)" 
          value={report.visibility || ''}
          onChange={e => onUpdate({ ...report, visibility: Number(e.target.value) }, false)}
        />
        <Input 
          placeholder="Wind Speed (knots)" 
          value={report.windSpeed || ''}
          onChange={e => onUpdate({ ...report, windSpeed: Number(e.target.value) }, false)}
        />
        <Input 
          placeholder="Wind Direction" 
          value={report.windDirection || ''}
          onChange={e => onUpdate({ ...report, windDirection: Number(e.target.value) }, false)}
        />
      </div>
       <Textarea 
          placeholder="Describe overall weather conditions (e.g., METAR, general description)..."
          value={report.weatherConditions || ''}
          onChange={e => onUpdate({ ...report, weatherConditions: e.target.value }, false)}
        />
    </div>
  );
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
  
  const showScfFields = report.occurrenceCategory === 'SCF-NP' || report.occurrenceCategory === 'SCF-PP';
  const showLosFields = report.occurrenceCategory === 'MAC';
  const showWeatherFields = report.occurrenceCategory && WEATHER_RELATED_CATEGORIES.includes(report.occurrenceCategory);
  const showBirdStrikeFields = report.occurrenceCategory === 'BIRD';

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
            </Card>
                
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-6 h-auto">
                    <TabsTrigger value="details">Report Details</TabsTrigger>
                    <TabsTrigger value="classification">Classification</TabsTrigger>
                    <TabsTrigger value="investigation">Investigation</TabsTrigger>
                    <TabsTrigger value="risk-mitigation">Risk Mitigation</TabsTrigger>
                    <TabsTrigger value="corrective-action">Corrective Action</TabsTrigger>
                    <TabsTrigger value="final-review">Final Review</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Details of Occurrence</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                        {report.details}
                    </p>
                </TabsContent>
                <TabsContent value="classification" className="mt-6 space-y-8">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2 flex-1 min-w-[200px]">
                            <label className="text-sm font-medium">Report Status</label>
                            <Select 
                                value={report.status} 
                                onValueChange={(value: SafetyReport['status']) => handleReportUpdate({ ...report, status: value })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Under Review">Under Review</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[240px]">
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
                            <div className="space-y-2 flex-1 min-w-[200px]">
                            <label className="text-sm font-medium">Classification</label>
                            <Select 
                                value={report.classification || ''}
                                onValueChange={(value: SafetyReport['classification']) => handleReportUpdate({ ...report, classification: value })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Classify event" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASSIFICATION_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {showScfFields && (
                        <div className="space-y-2 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium">System/Component Failure Details</label>
                            <Select 
                                value={report.subCategory || ''}
                                onValueChange={(value) => handleReportUpdate({ ...report, subCategory: value }, false)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select the affected system" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCF_SUBCATEGORIES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Textarea
                                placeholder="Add any other relevant details about the system/component failure..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                            />
                        </div>
                    )}

                    {showLosFields && (
                        <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium block mb-2">Loss of Separation Details</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Event Type</label>
                                    <Select value={report.subCategory || ''} onValueChange={(value) => handleReportUpdate({ ...report, subCategory: value }, false)}>
                                        <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                                        <SelectContent>
                                            {LOS_SUBCATEGORIES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {report.subCategory === 'Resolution Advisory (RA)' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">RA Callout</label>
                                                <Select value={report.raCallout || ''} onValueChange={(value) => handleReportUpdate({ ...report, raCallout: value }, false)}>
                                                <SelectTrigger><SelectValue placeholder="Select RA callout" /></SelectTrigger>
                                                <SelectContent>
                                                    {RA_CALLOUTS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">RA Followed?</label>
                                                <Select value={report.raFollowed || ''} onValueChange={(value: 'Yes' | 'No') => handleReportUpdate({ ...report, raFollowed: value }, false)}>
                                                <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Yes">Yes</SelectItem>
                                                    <SelectItem value="No">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Textarea
                                placeholder="Add any other relevant details about the loss of separation..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                            />
                        </div>
                    )}
                    
                    {showWeatherFields && (
                        <WeatherInputGroup report={report} onUpdate={handleReportUpdate} />
                    )}

                    {showBirdStrikeFields && (
                            <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium block flex items-center gap-2">
                                <Bird className="h-4 w-4" />
                                Bird Strike Details
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                <div className="space-y-2">
                                    <Label htmlFor="bird-number">Number of Birds</Label>
                                    <Select value={report.numberOfBirds || ''} onValueChange={(value) => handleReportUpdate({ ...report, numberOfBirds: value }, false)}>
                                        <SelectTrigger id="bird-number"><SelectValue placeholder="Select number" /></SelectTrigger>
                                        <SelectContent>{BIRD_NUMBERS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bird-size">Size of Birds</Label>
                                    <Select value={report.sizeOfBirds || ''} onValueChange={(value) => handleReportUpdate({ ...report, sizeOfBirds: value }, false)}>
                                        <SelectTrigger id="bird-size"><SelectValue placeholder="Select size" /></SelectTrigger>
                                        <SelectContent>{BIRD_SIZES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bird-part">Part Struck</Label>
                                    <Select value={report.partOfAircraftStruck || ''} onValueChange={(value) => handleReportUpdate({ ...report, partOfAircraftStruck: value }, false)}>
                                        <SelectTrigger id="bird-part"><SelectValue placeholder="Select part" /></SelectTrigger>
                                        <SelectContent>{BIRD_STRIKE_PARTS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch 
                                        id="bird-damage"
                                        checked={report.birdStrikeDamage}
                                        onCheckedChange={(checked) => handleReportUpdate({ ...report, birdStrikeDamage: checked }, false)}
                                    />
                                    <Label htmlFor="bird-damage">Damage Reported?</Label>
                                </div>
                            </div>
                                <Textarea
                                placeholder="Add any other relevant details about the bird strike..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                                />
                            </div>
                    )}

                    <InitialRiskAssessment report={report} onUpdate={handleReportUpdate} onPromoteRisk={handlePromoteRisk}/>
                </TabsContent>
                
                <TabsContent value="investigation" className="mt-6 space-y-6">
                    <InvestigationTeamForm report={report} onUpdate={handleReportUpdate} />
                    <Separator />
                    <DiscussionSection report={report} onUpdate={handleReportUpdate} />
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="investigation-notes" className="text-base font-semibold">Investigation Notes &amp; Findings</Label>
                            <Textarea 
                                id="investigation-notes"
                                placeholder="Record all investigation notes, findings, and discussions here..."
                                className="min-h-[300px]"
                                value={report.investigationNotes || ''}
                                onChange={(e) => handleReportUpdate({ ...report, investigationNotes: e.target.value }, false)}
                            />
                        </div>
                        <div className="space-y-6">
                            <InvestigationStepsGenerator report={report} />
                            <FiveWhysGenerator report={report} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="risk-mitigation" className="mt-6 space-y-6">
                    <MitigatedRiskAssessment report={report} onUpdate={handleReportUpdate} />
                </TabsContent>
                <TabsContent value="corrective-action" className="mt-6">
                    <CorrectiveActionPlanGenerator report={report} onUpdate={handleReportUpdate} />
                </TabsContent>
                <TabsContent value="final-review" className="mt-6">
                    <FinalReview report={report} onUpdate={handleReportUpdate} />
                </TabsContent>
            </Tabs>
        </div>
      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;

    