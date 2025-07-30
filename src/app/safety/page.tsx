

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, MapPin, Edit, Printer, ArrowUpDown, Search, TrendingUp, AlertTriangle, CheckCircle, Clock, Archive, RotateCw, Shield } from 'lucide-react';
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
import type { SafetyReport, Risk, GroupedRisk, Department, CompletedChecklist, Booking } from '@/lib/types';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
import { useUser } from '@/context/user-provider';
import { format, parseISO, startOfMonth, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { REPORT_TYPE_DEPARTMENT_MAPPING } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { EditSpiForm, type SpiConfig } from './edit-spi-form';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, updateDoc } from 'firebase/firestore';
import { RiskRegister } from './risk-register';
import { RiskAssessmentTool } from './[reportId]/risk-assessment-tool';


function groupRisksByArea(risks: Risk[]): GroupedRisk[] {
  const grouped: { [key: string]: Risk[] } = risks.reduce((acc, risk) => {
    const area = risk.hazardArea || 'Uncategorized';
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
  monthlyFlightHours: Record<string, number>;
  monthlyChecklistCompletion: Record<string, number>;
}

const SafetyPerformanceIndicators = ({ reports, spiConfigs, onConfigChange, monthlyFlightHours, monthlyChecklistCompletion }: SafetyPerformanceIndicatorsProps) => {
    const [editingSpi, setEditingSpi] = useState<SpiConfig | null>(null);

    const handleSpiUpdate = (updatedSpi: SpiConfig) => {
        onConfigChange(spiConfigs.map(spi => spi.id === updatedSpi.id ? updatedSpi : spi));
        setEditingSpi(null);
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
                {spiConfigs.map(config => {
                    let spiData;
                    if (config.id === 'checklistCompletion') {
                        spiData = monthlyChecklistCompletion;
                    } else {
                        spiData = reports
                            .filter(r => config.filter(r))
                            .reduce((acc, report) => {
                                const month = format(startOfMonth(parseISO(report.filedDate)), 'MMM yy');
                                acc[month] = (acc[month] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);
                    }


                    const chartData = Object.keys(spiData).map(month => {
                        const value = spiData[month as keyof typeof spiData];
                        if (config.calculation === 'rate' && config.unit && config.id !== 'checklistCompletion') {
                            const totalHours = monthlyFlightHours[month as keyof typeof monthlyFlightHours] || 0;
                            const rate = totalHours > 0 ? ((value as number) / totalHours) * 100 : 0;
                            return { name: month, value: parseFloat(rate.toFixed(2)) };
                        }
                        return { name: month, value: value as number };
                    }).reverse();
                    
                    const latestValue = chartData[0]?.value || 0;
                    
                     const getStatus = (value: number) => {
                        const { targetDirection, alert4, alert3, alert2, target } = config;
                        if (targetDirection === '>=') {
                            if (value < alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
                            if (value < alert3) return { label: 'Action Required', variant: 'orange' as const };
                            if (value < alert2) return { label: 'Monitor', variant: 'warning' as const };
                            return { label: 'Acceptable', variant: 'success' as const };
                        } else { // '<=' direction
                            if (value > alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
                            if (value > alert3) return { label: 'Action Required', variant: 'orange' as const };
                            if (value > alert2) return { label: 'Monitor', variant: 'warning' as const };
                            return { label: 'Acceptable', variant: 'success' as const };
                        }
                    };

                    const status = getStatus(latestValue);
                    
                    const ChartComponent = config.id === 'checklistCompletion' || config.calculation === 'rate' ? LineChart : BarChart;
                    const ChartTypeComponent = config.id === 'checklistCompletion' || config.calculation === 'rate' ? Line : Bar;
                    
                    const chartProps: any = {
                        dataKey: "value",
                        name: config.name,
                    };
                    if (ChartComponent === LineChart) {
                        chartProps.stroke = "hsl(var(--primary))";
                        chartProps.strokeWidth = 2;
                        chartProps.activeDot = { r: 8 };
                        chartProps.type = "monotone";
                    } else {
                        chartProps.children = chartData.map((entry, index) => {
                            const entryStatus = getStatus(entry.value);
                            const color = {
                                'success': 'hsl(var(--success))',
                                'warning': 'hsl(var(--warning))',
                                'orange': 'hsl(var(--orange))',
                                'destructive': 'hsl(var(--destructive))'
                            }[entryStatus.variant];
                            return <Cell key={`cell-${index}`} fill={color} />;
                        });
                    }


                    return (
                        <Card key={config.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{config.name}</CardTitle>
                                        <CardDescription className="text-xs">Type: {config.type}</CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={status.variant}>
                                            {status.label}
                                        </Badge>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingSpi(config)}>
                                            <Edit className="h-3 w-3 mr-1" /> Edit Targets
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-center">
                                <ResponsiveContainer width="100%" height={250}>
                                    <ChartComponent data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={config.calculation === 'rate' || config.id === 'checklistCompletion'} unit={config.id === 'checklistCompletion' ? '%' : ''} />
                                        <Tooltip formatter={(value) => `${value} ${config.unit || ''}`} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <ReferenceLine y={config.target} label={{ value: 'Target', position: 'insideTopLeft', fill: 'hsl(var(--success-foreground))' }} stroke="hsl(var(--success))" strokeDasharray="3 3" />
                                        <ReferenceLine y={config.alert2} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                                        <ReferenceLine y={config.alert3} stroke="hsl(var(--orange))" strokeDasharray="3 3" />
                                        <ReferenceLine y={config.alert4} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                                        <ChartTypeComponent {...chartProps} />
                                    </ChartComponent>
                                </ResponsiveContainer>
                            </CardContent>
                             <CardFooter className="text-center text-xs text-muted-foreground justify-center">
                                <p>Safety Performance Target: {config.targetDirection} {config.target} {config.unit || ''}</p>
                            </CardFooter>
                        </Card>
                    )
                })}
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
    
    const calculateAvgTimeToClose = () => {
        const closedReports = reports.filter(r => r.status === 'Closed' && r.closedDate);
        if (closedReports.length === 0) return { value: 'N/A', description: 'No closed reports yet' };

        const totalDays = closedReports.reduce((sum, report) => {
            const filed = parseISO(report.filedDate);
            const closed = parseISO(report.closedDate!);
            return sum + differenceInDays(closed, filed);
        }, 0);

        const avgDays = Math.round(totalDays / closedReports.length);
        
        if (isNaN(avgDays)) {
             return { value: 'N/A', description: 'Calculation error' };
        }

        return {
            value: `${avgDays} Days`,
            description: `Based on ${closedReports.length} closed report(s)`
        };
    };

    const avgTimeToClose = calculateAvgTimeToClose();

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
                        <div className="text-2xl font-bold">{avgTimeToClose.value}</div>
                        <p className="text-xs text-muted-foreground">{avgTimeToClose.description}</p>
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
                                    const score = {Low: 1, Medium: 5, High: 10, Extreme: 4}[entry.name] || 1;
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

function SafetyPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [completedChecklists, setCompletedChecklists] = useState<CompletedChecklist[]>([]);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const { user, company, loading } = useUser();
  const { toast } = useToast();
  const [isNewTargetDialogOpen, setIsNewTargetDialogOpen] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    if (!company) return;
    try {
        const reportsQuery = query(collection(db, `companies/${company.id}/safety-reports`));
        const risksQuery = query(collection(db, `companies/${company.id}/risks`));
        const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
        const checklistsQuery = query(collection(db, `companies/${company.id}/completedChecklists`));

        const [reportsSnapshot, risksSnapshot, bookingsSnapshot, checklistsSnapshot] = await Promise.all([
            getDocs(reportsQuery),
            getDocs(risksQuery),
            getDocs(bookingsQuery),
            getDocs(checklistsQuery),
        ]);

        const reportsList = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyReport));
        const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Risk));
        const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const checklistsList = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompletedChecklist));
        
        setSafetyReports(reportsList);
        setRisks(risksList);
        setBookings(bookingsList);
        setCompletedChecklists(checklistsList);

    } catch (error) {
        console.error("Error fetching safety data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch safety data.' });
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

  const [spiConfigs, setSpiConfigs] = useState<SpiConfig[]>([
    { 
        id: 'unstableApproaches', 
        name: 'Unstable Approach Rate',
        type: 'Lagging Indicator',
        calculation: 'count',
        unit: 'Per Month',
        targetDirection: '<=',
        target: 1, alert2: 2, alert3: 3, alert4: 4, 
        filter: (r: SafetyReport) => r.subCategory === 'Unstable Approach' 
    },
    { 
        id: 'adr', 
        name: 'Aircraft Technical Defect Rate',
        type: 'Lagging Indicator',
        calculation: 'count',
        unit: 'Per Month',
        targetDirection: '<=',
        target: 3, alert2: 4, alert3: 5, alert4: 6, 
        filter: (r: SafetyReport) => r.type === 'Aircraft Defect Report'
    },
    {
        id: 'allIncidentsRate',
        name: 'All Incidents per 100 Flight Hours',
        type: 'Lagging Indicator',
        calculation: 'rate',
        unit: 'per 100 hours',
        targetDirection: '<=',
        target: 0.5, alert2: 0.75, alert3: 1.0, alert4: 1.25,
        filter: (r: SafetyReport) => r.type && r.type.includes('Report'),
    },
    {
        id: 'checklistCompletion',
        name: 'Pre-Flight Checklist Completion Rate',
        type: 'Leading Indicator',
        calculation: 'rate',
        unit: '%',
        targetDirection: '>=',
        target: 98, alert2: 95, alert3: 90, alert4: 85,
        filter: (r: SafetyReport) => false, // This is calculated differently
    }
  ]);

  const reportsControls = useTableControls(safetyReports.filter(r => r.status !== 'Archived'), {
    initialSort: { key: 'filedDate', direction: 'desc' },
    searchKeys: ['reportNumber', 'heading', 'details', 'department'],
  });
  
  const archivedReportsControls = useTableControls(safetyReports.filter(r => r.status === 'Archived'), {
    initialSort: { key: 'filedDate', direction: 'desc' },
    searchKeys: ['reportNumber', 'heading', 'details', 'department'],
  });

  const getStatusVariant = (status: SafetyReport['status']) => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'Under Review': return 'warning';
      case 'Closed': return 'success';
      case 'Archived': return 'secondary';
      default: return 'outline';
    }
  };
  
  const handleArchiveReport = async (reportId: string) => {
    if (!company) return;
    try {
        const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
        await updateDoc(reportRef, { status: 'Archived' });
        setSafetyReports(prev => prev.map(r => r.id === reportId ? {...r, status: 'Archived'} : r));
        toast({ title: 'Report Archived', description: 'The safety report has been archived.' });
    } catch (error) {
        console.error("Error archiving report:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not archive the report.' });
    }
  };
  
  const handleReactivateReport = async (reportId: string) => {
    if (!company) return;
    try {
        const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
        await updateDoc(reportRef, { status: 'Open' }); // Or 'Under Review'
        setSafetyReports(prev => prev.map(r => r.id === reportId ? {...r, status: 'Open'} : r));
        toast({ title: 'Report Reactivated', description: 'The safety report has been moved back to active reports.' });
    } catch (error) {
        console.error("Error reactivating report:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reactivate the report.' });
    }
  };

  const monthlyFlightHours = bookings
    .filter(b => b.status === 'Completed' && b.flightDuration)
    .reduce((acc, booking) => {
        const month = format(startOfMonth(parseISO(booking.date)), 'MMM yy');
        acc[month] = (acc[month] || 0) + booking.flightDuration!;
        return acc;
    }, {} as Record<string, number>);

  const monthlyChecklistStats = completedChecklists
    .filter(c => c.checklistType === 'Pre-Flight')
    .reduce((acc, checklist) => {
        const month = format(startOfMonth(parseISO(checklist.completionDate)), 'MMM yy');
        if (!acc[month]) {
            acc[month] = { completed: 0, required: 0 };
        }
        acc[month].completed += 1;
        return acc;
    }, {} as Record<string, { completed: number, required: number }>);
  
  bookings.filter(b => b.purpose === 'Training' || b.purpose === 'Private').forEach(booking => {
    const month = format(startOfMonth(parseISO(booking.date)), 'MMM yy');
    if (!monthlyChecklistStats[month]) {
        monthlyChecklistStats[month] = { completed: 0, required: 0 };
    }
    monthlyChecklistStats[month].required += 1;
  });

  const checklistCompletionRate = Object.keys(monthlyChecklistStats).reduce((acc, month) => {
    const data = monthlyChecklistStats[month];
    acc[month] = data.required > 0 ? Math.round((data.completed / data.required) * 100) : 100;
    return acc;
  }, {} as Record<string, number>);


  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof SafetyReport | keyof Risk }) => {
    const controls = activeTab === 'reports' ? reportsControls : reportsControls; // Simplified for now
    return (
        <Button variant="ghost" onClick={() => controls.requestSort(sortKey as any)}>
            {label}
            {controls.sortConfig?.key === sortKey ? (
                <ArrowUpDown className={`ml-2 h-4 w-4 ${controls.sortConfig.direction === 'asc' ? '' : 'rotate-180'}`} />
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />
            )}
        </Button>
    );
  };
  
  const handleNewSpiSubmit = (newSpi: SpiConfig) => {
    setSpiConfigs(prev => [...prev, { ...newSpi, filter: () => true }]); // Generic filter for new SPI
    setIsNewTargetDialogOpen(false);
     toast({
        title: "SPI Target Added",
        description: `A new target for "${newSpi.name}" has been added.`
    });
  }

  const renderActionButton = () => {
    if (activeTab === 'spis') {
      return (
        <Dialog open={isNewTargetDialogOpen} onOpenChange={setIsNewTargetDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Target
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New SPI Target</DialogTitle>
                    <DialogDescription>
                        Define a new Safety Performance Indicator and its alert levels.
                    </DialogDescription>
                </DialogHeader>
                <EditSpiForm 
                    spi={{ id: `spi-${Date.now()}`, name: 'Runway Excursions', type: 'Lagging Indicator', calculation: 'count', targetDirection: '<=', filter: (r) => r.subCategory === 'Runway Excursion', target: 0, alert2: 1, alert3: 2, alert4: 3 }} 
                    onUpdate={handleNewSpiSubmit} 
                />
            </DialogContent>
        </Dialog>
      );
    }
    return (
        <Button asChild>
            <Link href="/safety/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                File New Report
            </Link>
        </Button>
    );
  };

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  const ReportTable = ({ reports }: { reports: SafetyReport[] }) => {
    const controls = reports.some(r => r.status === 'Archived') ? archivedReportsControls : reportsControls;

    return (
      <>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={controls.searchTerm}
              onChange={(e) => controls.setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Report #" sortKey="reportNumber" /></TableHead>
              <TableHead className="hidden md:table-cell"><SortableHeader label="Occurrence Date" sortKey="occurrenceDate" /></TableHead>
              <TableHead>Report</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              <TableHead className="hidden lg:table-cell">Aircraft</TableHead>
              <TableHead className="hidden xl:table-cell">Location</TableHead>
              <TableHead><SortableHeader label="Status" sortKey="status" /></TableHead>
              <TableHead className="text-right no-print">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.items.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <Link href={`/safety/${report.id}`} className="hover:underline">
                    {report.reportNumber}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">{report.occurrenceDate}</TableCell>
                <TableCell className="max-w-xs font-medium truncate">
                  {report.heading}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{report.department}</TableCell>
                <TableCell className="hidden lg:table-cell">{report.aircraftInvolved || 'N/A'}</TableCell>
                <TableCell className="hidden xl:table-cell">
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
                      {report.status !== 'Archived' && user.permissions.includes('Super User') && (
                        <DropdownMenuItem onClick={() => handleArchiveReport(report.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                        </DropdownMenuItem>
                      )}
                      {report.status === 'Archived' && user.permissions.includes('Super User') && (
                        <DropdownMenuItem onClick={() => handleReactivateReport(report.id)}>
                            <RotateCw className="mr-2 h-4 w-4" />
                            Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {controls.items.length === 0 && (
          <div className="text-center text-muted-foreground py-10">No reports found.</div>
        )}
      </>
    );
  };

  return (
      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4 no-print">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="reports">Safety Reports</TabsTrigger>
              <TabsTrigger value="register">Risk Register</TabsTrigger>
              <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
              <TabsTrigger value="spis">SPIs</TabsTrigger>
            </TabsList>
            {renderActionButton()}
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
                <Tabs defaultValue="active">
                    <TabsList>
                        <TabsTrigger value="active">Active Reports</TabsTrigger>
                        <TabsTrigger value="archived">Archived Reports</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                        <ReportTable reports={safetyReports.filter(r => r.status !== 'Archived')} />
                    </TabsContent>
                    <TabsContent value="archived">
                        <ReportTable reports={safetyReports.filter(r => r.status === 'Archived')} />
                    </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
             <RiskRegister risks={risks} onUpdate={fetchData} />
          </TabsContent>
          <TabsContent value="matrix">
             <RiskAssessmentTool />
          </TabsContent>
          <TabsContent value="spis">
            <SafetyPerformanceIndicators 
                reports={safetyReports} 
                spiConfigs={spiConfigs} 
                onConfigChange={setSpiConfigs} 
                monthlyFlightHours={monthlyFlightHours}
                monthlyChecklistCompletion={checklistCompletionRate}
            />
          </TabsContent>
        </Tabs>
      </main>
  );
}

SafetyPage.title = 'Safety Management System';
export default SafetyPage;
