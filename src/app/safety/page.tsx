
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, MapPin, Edit, Printer, ArrowUpDown, Search, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
import type { SafetyReport, Risk, GroupedRisk, Department } from '@/lib/types';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
import { NewSafetyReportForm } from './new-safety-report-form';
import { RiskAssessmentTool } from './risk-assessment-tool';
import { useUser } from '@/context/user-provider';
import { format, parseISO, startOfMonth } from 'date-fns';
import Link from 'next/link';
import { NewRiskForm } from './new-risk-form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { EditRiskForm } from './edit-risk-form';
import { RiskMatrix } from './risk-matrix';
import { REPORT_TYPE_DEPARTMENT_MAPPING } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { EditSpiForm, type SpiConfig } from './edit-spi-form';

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

interface SafetyPerformanceIndicatorsProps {
  reports: SafetyReport[];
  spiConfigs: SpiConfig[];
  onConfigChange: (newConfigs: SpiConfig[]) => void;
}

const SafetyPerformanceIndicators = ({ reports, spiConfigs, onConfigChange }: SafetyPerformanceIndicatorsProps) => {
    const [editingSpi, setEditingSpi] = useState<SpiConfig | null>(null);

    const handleSpiUpdate = (updatedSpi: SpiConfig) => {
        onConfigChange(spiConfigs.map(spi => spi.id === updatedSpi.id ? updatedSpi : spi));
        setEditingSpi(null);
    };

    const unstableApproachesConfig = spiConfigs.find(c => c.id === 'unstableApproaches')!;
    const adrConfig = spiConfigs.find(c => c.id === 'adr')!;

    // === SPI 1: Unstable Approach Rate ===
    const unstableApproachesByMonth = reports
        .filter(r => r.subCategory === 'Unstable Approach')
        .reduce((acc, report) => {
            const month = format(startOfMonth(parseISO(report.filedDate)), 'MMM yy');
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const unstableApproachesData = Object.keys(unstableApproachesByMonth).map(month => ({
        name: month,
        count: unstableApproachesByMonth[month],
    })).reverse();
    const latestUnstableApproachCount = unstableApproachesData[0]?.count || 0;
    
    const getUnstableApproachStatus = (count: number) => {
        if (count >= unstableApproachesConfig.alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
        if (count >= unstableApproachesConfig.alert3) return { label: 'Action Required', variant: 'orange' as const };
        if (count >= unstableApproachesConfig.alert2) return { label: 'Monitor', variant: 'warning' as const };
        return { label: 'Acceptable', variant: 'success' as const };
    };

    // === SPI 2: Technical Defect Rate ===
    const adrByMonth = reports
        .filter(r => r.type === 'Aircraft Defect Report')
        .reduce((acc, report) => {
            const month = format(startOfMonth(parseISO(report.filedDate)), 'MMM yy');
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const adrData = Object.keys(adrByMonth).map(month => ({
        name: month,
        count: adrByMonth[month],
    })).reverse();
    const latestAdrCount = adrData[0]?.count || 0;

    const getAdrStatus = (count: number) => {
        if (count >= adrConfig.alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
        if (count >= adrConfig.alert3) return { label: 'Action Required', variant: 'orange' as const };
        if (count >= adrConfig.alert2) return { label: 'Monitor', variant: 'warning' as const };
        return { label: 'Acceptable', variant: 'success' as const };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Safety Performance Indicators (SPIs)</CardTitle>
                <CardDescription>
                    Monitoring key indicators to proactively manage safety, based on ICAO and SACAA principles.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                 <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">Unstable Approach Rate</CardTitle>
                                <CardDescription className="text-xs">Type: Lagging Indicator</CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant={getUnstableApproachStatus(latestUnstableApproachCount).variant}>
                                    {getUnstableApproachStatus(latestUnstableApproachCount).label}
                                </Badge>
                                <Button variant="ghost" size="sm" onClick={() => setEditingSpi(unstableApproachesConfig)}>
                                    <Edit className="h-3 w-3 mr-1" /> Edit Targets
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={unstableApproachesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend verticalAlign="top" height={36}/>
                                <ReferenceLine y={unstableApproachesConfig.target} label={{ value: 'Target', position: 'insideTopLeft', fill: 'hsl(var(--success-foreground))' }} stroke="hsl(var(--success-foreground))" strokeDasharray="3 3" />
                                <ReferenceLine y={unstableApproachesConfig.alert2} stroke="hsl(var(--warning-foreground))" strokeDasharray="3 3" />
                                <ReferenceLine y={unstableApproachesConfig.alert3} stroke="hsl(var(--orange-foreground))" strokeDasharray="3 3" />
                                <ReferenceLine y={unstableApproachesConfig.alert4} stroke="hsl(var(--destructive-foreground))" strokeDasharray="3 3" />
                                <Bar dataKey="count" name="Unstable Approaches">
                                    {unstableApproachesData.map((entry, index) => {
                                        const status = getUnstableApproachStatus(entry.count);
                                        const color = {
                                            'success': 'hsl(var(--success))',
                                            'warning': 'hsl(var(--warning))',
                                            'orange': 'hsl(var(--orange))',
                                            'destructive': 'hsl(var(--destructive))'
                                        }[status.variant];
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                     <CardFooter className="text-center text-xs text-muted-foreground justify-center">
                        <p>Safety Performance Target: &lt;= {unstableApproachesConfig.target} per month.</p>
                    </CardFooter>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">Aircraft Technical Defect Rate</CardTitle>
                                <CardDescription className="text-xs">Type: Lagging Indicator</CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant={getAdrStatus(latestAdrCount).variant}>
                                    {getAdrStatus(latestAdrCount).label}
                                </Badge>
                                 <Button variant="ghost" size="sm" onClick={() => setEditingSpi(adrConfig)}>
                                    <Edit className="h-3 w-3 mr-1" /> Edit Targets
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={adrData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend verticalAlign="top" height={36}/>
                                <ReferenceLine y={adrConfig.target} label={{ value: 'Target', position: 'insideTopLeft' }} stroke="hsl(var(--success-foreground))" strokeDasharray="3 3" />
                                <ReferenceLine y={adrConfig.alert2} stroke="hsl(var(--warning-foreground))" strokeDasharray="3 3" />
                                <ReferenceLine y={adrConfig.alert3} stroke="hsl(var(--orange-foreground))" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="count" name="Defect Reports" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <CardFooter className="text-center text-xs text-muted-foreground justify-center">
                       <p>Safety Performance Target: &lt;= {adrConfig.target} per month.</p>
                    </CardFooter>
                </Card>
            </CardContent>
            {editingSpi && (
                <Dialog open={!!editingSpi} onOpenChange={() => setEditingSpi(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit SPI: {editingSpi.name}</DialogTitle>
                            <DialogDescription>
                                Adjust the target and alert levels for this Safety Performance Indicator.
                            </DialogDescription>
                        </DialogHeader>
                        <EditSpiForm spi={editingSpi} onUpdate={handleSpiUpdate} />
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
};

const SafetyDashboard = ({ reports, risks }: { reports: SafetyReport[], risks: Risk[] }) => {
    const openReports = reports.filter(r => r.status !== 'Closed').length;
    const highRiskIssues = risks.filter(r => (r.riskScore || 0) >= 10).length;
    
    const reportsByMonth = reports.reduce((acc, report) => {
        const month = format(startOfMonth(parseISO(report.filedDate)), 'MMM yy');
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const reportsOverTimeData = Object.keys(reportsByMonth).map(month => ({
        name: month,
        reports: reportsByMonth[month],
    })).reverse();

    const reportsByStatus = reports.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const reportsByStatusData = Object.keys(reportsByStatus).map(status => ({
        name: status,
        value: reportsByStatus[status],
    }));
    
    const riskLevels = risks.filter(r => r.status === 'Open').reduce((acc, risk) => {
        const level = getRiskLevel(risk.riskScore);
        acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const riskLevelsData = Object.keys(riskLevels).map(level => ({
        name: level,
        count: riskLevels[level],
    })).sort((a,b) => { // Ensure consistent order
        const order = { 'Low': 1, 'Medium': 2, 'High': 3, 'Extreme': 4 };
        return order[a.name as keyof typeof order] - order[b.name as keyof typeof order];
    });

    const statusColors = {
        'Open': 'hsl(var(--destructive))',
        'Under Review': 'hsl(var(--warning))',
        'Closed': 'hsl(var(--success))',
    };

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Reports</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{openReports}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High/Extreme Risks</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{highRiskIssues}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Time to Close</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14 Days</div>
                        <p className="text-xs text-muted-foreground">(Mock Data)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Reports Over Time</CardTitle>
                        <CardDescription>Number of safety reports filed per month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportsOverTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="reports" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Reports by Status</CardTitle>
                        <CardDescription>Breakdown of all safety reports.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                           <PieChart>
                                <Pie data={reportsByStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {reportsByStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={statusColors[entry.name as keyof typeof statusColors]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Open Risk Level Distribution</CardTitle>
                    <CardDescription>Number of open risks in each risk category.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={riskLevelsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Number of Risks">
                                {riskLevelsData.map((entry, index) => {
                                    const score = {Low: 1, Medium: 5, High: 10, Extreme: 17}[entry.name] || 1;
                                    return <Cell key={`cell-${index}`} fill={getRiskScoreColor(score)} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default function SafetyPage() {
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(initialSafetyReports);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [isNewRiskOpen, setIsNewRiskOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  const [spiConfigs, setSpiConfigs] = useState<SpiConfig[]>([
    { id: 'unstableApproaches', name: 'Unstable Approach Rate', target: 1, alert2: 2, alert3: 3, alert4: 4 },
    { id: 'adr', name: 'Aircraft Technical Defect Rate', target: 3, alert2: 4, alert3: 5, alert4: 6 }
  ]);

  const reportsControls = useTableControls(safetyReports, {
    initialSort: { key: 'filedDate', direction: 'desc' },
    searchKeys: ['reportNumber', 'heading', 'details', 'department'],
  });

  const riskControls = useTableControls(risks, {
    initialSort: { key: 'riskScore', direction: 'desc'},
    searchKeys: ['hazard', 'risk', 'riskOwner', 'reportNumber'],
  })

  const groupedRiskData = groupRisksByArea(riskControls.items);

  const getStatusVariant = (status: SafetyReport['status']) => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'Under Review': return 'warning';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  };
  
  const handleNewReportSubmit = (newReportData: Omit<SafetyReport, 'id' | 'submittedBy' | 'status' | 'filedDate' | 'department'> & { isAnonymous?: boolean }) => {
    const { isAnonymous, ...reportData } = newReportData;
    const department = REPORT_TYPE_DEPARTMENT_MAPPING[reportData.type];
    const newReport: SafetyReport = {
        id: `sr-${Date.now()}`,
        submittedBy: isAnonymous ? 'Anonymous' : (user?.name || 'System'),
        status: 'Open',
        filedDate: format(new Date(), 'yyyy-MM-dd'),
        department: department,
        ...reportData,
    };
    setSafetyReports(prev => [newReport, ...prev]);
    setIsNewReportOpen(false);
  };
  
  const handleNewRiskSubmit = (newRiskData: Omit<Risk, 'id' | 'dateIdentified' | 'riskScore' | 'status'>) => {
    const newRisk: Risk = {
      ...newRiskData,
      id: `risk-reg-${Date.now()}`,
      dateIdentified: format(new Date(), 'yyyy-MM-dd'),
      riskScore: getRiskScore(newRiskData.likelihood, newRiskData.severity),
      status: 'Open',
    };
    setRisks(prev => [newRisk, ...prev]);
    setIsNewRiskOpen(false);
  };
  
  const handleEditRiskSubmit = (updatedRiskData: Risk) => {
    setRisks(prevRisks => prevRisks.map(r => r.id === updatedRiskData.id ? updatedRiskData : r));
    setEditingRisk(null);
    toast({
        title: "Risk Updated",
        description: "The risk details have been successfully saved."
    });
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof SafetyReport }) => {
    const { sortConfig, requestSort } = reportsControls;
    const isSorted = sortConfig?.key === sortKey;
    return (
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
            {label}
            {isSorted && <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? '' : 'rotate-180'}`} />}
            {!isSorted && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
        </Button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Safety Management System" />
      <main className="flex-1 p-4 md:p-8">
        <Tabs defaultValue="dashboard">
          <div className="flex items-center justify-between mb-4 no-print">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="reports">Safety Reports</TabsTrigger>
              <TabsTrigger value="register">Risk Register</TabsTrigger>
              <TabsTrigger value="spis">SPIs</TabsTrigger>
              <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
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

          <TabsContent value="dashboard">
            <SafetyDashboard reports={safetyReports} risks={risks} />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Filed Safety Reports</CardTitle>
                <CardDescription>Incidents and hazards reported by personnel.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center py-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={reportsControls.searchTerm}
                      onChange={(e) => reportsControls.setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><SortableHeader label="Report #" sortKey="reportNumber" /></TableHead>
                      <TableHead><SortableHeader label="Occurrence Date" sortKey="occurrenceDate" /></TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead><SortableHeader label="Status" sortKey="status" /></TableHead>
                      <TableHead className="text-right no-print">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsControls.items.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono">
                           <Link href={`/safety/${report.id}`} className="hover:underline">
                                {report.reportNumber}
                           </Link>
                        </TableCell>
                        <TableCell>{report.occurrenceDate}</TableCell>
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
                        <TableCell>{report.department}</TableCell>
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
                        <TableCell className="text-right no-print">
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
                 {reportsControls.items.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">No reports found.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between no-print">
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
                 <div className="flex items-center py-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search risks..."
                      value={riskControls.searchTerm}
                      onChange={(e) => riskControls.setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-8">
                  {groupedRiskData.map(group => (
                    <div key={group.area} className="border rounded-lg">
                      <div className="bg-muted p-3 border-b">
                         <h3 className="font-semibold text-lg">{group.area}</h3>
                      </div>
                      <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">No.</TableHead>
                                    <TableHead className="w-[150px]">Source Report</TableHead>
                                    <TableHead className="w-[300px]">Hazard</TableHead>
                                    <TableHead className="w-[300px]">Risk</TableHead>
                                    <TableHead className="w-[300px]">Exposure</TableHead>
                                    <TableHead className="w-[120px]">
                                        <Button variant="ghost" onClick={() => riskControls.requestSort('riskScore')} className="px-0">
                                            Initial Risk
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[300px]">Existing Mitigation</TableHead>
                                    <TableHead className="w-[300px]">Proposed Mitigation</TableHead>
                                    <TableHead className="w-[120px]">Mitigated Value</TableHead>
                                    <TableHead className="w-[200px]">Owner</TableHead>
                                    <TableHead className="w-[150px]">
                                         <Button variant="ghost" onClick={() => riskControls.requestSort('reviewDate')} className="px-0">
                                            Review
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[80px] no-print">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {group.risks.map((risk, index) => (
                                    <TableRow key={risk.id}>
                                        <TableCell>{String(index + 1).padStart(3, '0')}</TableCell>
                                        <TableCell>
                                            {risk.reportNumber ? (
                                                <Link href={`/safety/${risk.reportNumber.replace(/[^a-zA-Z0-9-]/g, '')}`} className="font-mono hover:underline">{risk.reportNumber}</Link>
                                            ) : (
                                                'N/A'
                                            )}
                                        </TableCell>
                                        <TableCell>{risk.hazard}</TableCell>
                                        <TableCell>{risk.risk}</TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside">
                                                {risk.consequences.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </TableCell>
                                        <TableCell>
                                            <Badge style={{backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white'}} className="rounded-md w-12 justify-center">
                                                {risk.riskScore}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{risk.existingMitigation}</TableCell>
                                        <TableCell>{risk.proposedMitigation}</TableCell>
                                        <TableCell>
                                            {risk.residualRiskScore !== undefined ? (
                                                <Badge style={{backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white'}} className="rounded-md w-12 justify-center">
                                                    {risk.residualRiskScore}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{risk.riskOwner}</TableCell>
                                        <TableCell>{risk.reviewDate}</TableCell>
                                        <TableCell className="no-print">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => setEditingRisk(risk)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Risk
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  ))}
                   {groupedRiskData.length === 0 && (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No risks match your search.</p>
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spis">
            <SafetyPerformanceIndicators reports={safetyReports} spiConfigs={spiConfigs} onConfigChange={setSpiConfigs} />
          </TabsContent>

          <TabsContent value="matrix">
            <RiskMatrix risks={risks} />
          </TabsContent>
          
          <TabsContent value="assessment">
            <RiskAssessmentTool />
          </TabsContent>
        </Tabs>
        
        {editingRisk && (
            <Dialog open={!!editingRisk} onOpenChange={() => setEditingRisk(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Risk</DialogTitle>
                        <DialogDescription>
                            Update the details for the selected risk. Your changes will be saved to the register.
                        </DialogDescription>
                    </DialogHeader>
                    <EditRiskForm risk={editingRisk} onSubmit={handleEditRiskSubmit} />
                </DialogContent>
            </Dialog>
        )}

      </main>
    </div>
  );
}
