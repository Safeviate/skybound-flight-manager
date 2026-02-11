'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { QualityAudit, AuditScheduleItem, Alert, NonConformanceIssue, CorrectiveActionPlan, Risk, SafetyObjective, AuditChecklist, User, ComplianceItem, CompanyDepartment, Aircraft, Department, ManagementOfChange, SafetyReport, GroupedRisk, Booking, SpiConfig } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, startOfMonth, differenceInDays, isAfter, subMonths, eachMonthOfInterval, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, ListChecks, Search, MoreHorizontal, Archive, Percent, RotateCw, FileText, Trash2, PlusCircle, Edit, Database, ShieldCheck, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, ArrowUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, updateDoc, writeBatch, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTableControls } from '@/hooks/use-table-controls';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EditSpiForm } from './edit-spi-form';
import { RiskRegister } from './risk-register';
import { RiskAssessmentTool } from './[reportId]/risk-assessment-tool';
import { getSafetyPageData } from './data';
import { NewMocForm } from './new-moc-form';
import { getRiskLevel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SafetyPerformanceIndicatorsProps {
  reports: SafetyReport[];
  spiConfigs: SpiConfig[];
  onConfigChange: (newConfigs: SpiConfig[]) => void;
  monthlyFlightHours: Record<string, number>;
}

const SafetyPerformanceIndicators = ({ reports, spiConfigs, onConfigChange, monthlyFlightHours }: SafetyPerformanceIndicatorsProps) => {
    const [editingSpi, setEditingSpi] = useState<SpiConfig | null>(null);
    const [isNewTargetDialogOpen, setIsNewTargetDialogOpen] = useState(false);

    const handleSpiUpdate = (updatedSpi: SpiConfig) => {
        onConfigChange(spiConfigs.map(spi => spi.id === updatedSpi.id ? updatedSpi : spi));
        setEditingSpi(null);
    };

    const handleNewSpiSubmit = (newSpi: SpiConfig) => {
        onConfigChange([...spiConfigs, newSpi]);
        setIsNewTargetDialogOpen(false);
    };

    const last12Months = useMemo(() => {
        const end = new Date();
        const start = subMonths(end, 11);
        return eachMonthOfInterval({ start, end }).map(date => format(date, 'MMM yy'));
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <CardTitle>Safety Performance Indicators (SPIs)</CardTitle>
                    <CardDescription>
                        Monitoring key indicators to proactively manage safety, based on ICAO and SACAA principles.
                    </CardDescription>
                </div>
                 <Dialog open={isNewTargetDialogOpen} onOpenChange={setIsNewTargetDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Target
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                        <DialogTitle>Add New SPI Target</DialogTitle>
                        <DialogDescription>
                            Define a new Safety Performance Indicator and its alert levels.
                        </DialogDescription>
                        </DialogHeader>
                        <EditSpiForm
                        spi={{ id: `spi-${Date.now()}`, name: 'New Indicator', type: 'Lagging Indicator', calculation: 'count', unit: 'Per Month', targetDirection: '<=', target: 0, alert2: 1, alert3: 2, alert4: 3 }}
                        onUpdate={handleNewSpiSubmit}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {spiConfigs.map(config => {
                    let chartData = [];
                    let currentDisplayValue = 0;
                    
                    const matchesFilter = (r: SafetyReport) => {
                        if (config.filterType && config.filterType !== 'All' && r.type !== config.filterType) return false;
                        if (config.filterSubCategory && !r.subCategory?.toLowerCase().includes(config.filterSubCategory.toLowerCase())) return false;
                        return true;
                    };

                    if (config.isManual && config.manualData) {
                        chartData = last12Months.map(month => ({
                            name: month,
                            value: config.manualData![month] || 0
                        }));
                        
                        if (config.unit === 'Per Year') {
                            currentDisplayValue = chartData.reduce((sum, item) => sum + item.value, 0);
                        } else {
                            currentDisplayValue = chartData[chartData.length - 1]?.value || 0;
                        }
                    } else {
                        const spiDataByMonth = reports
                            .filter(matchesFilter)
                            .reduce((acc, report) => {
                                const month = format(startOfMonth(parseISO(report.filedDate)), 'MMM yy');
                                acc[month] = (acc[month] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                        chartData = last12Months.map(month => {
                            const count = spiDataByMonth[month] || 0;
                            let value = count;
                            if (config.calculation === 'rate' && config.unit) {
                                const totalHours = monthlyFlightHours[month] || 0;
                                const multiplier = config.unit.includes('1000') ? 1000 : 100;
                                value = totalHours > 0 ? (count / totalHours) * multiplier : 0;
                            }
                            return { name: month, value: parseFloat(value.toFixed(2)) };
                        });

                        if (config.unit === 'Per Year') {
                            const currentYearStart = startOfYear(new Date());
                            currentDisplayValue = reports.filter(r => isAfter(parseISO(r.filedDate), currentYearStart) && matchesFilter(r)).length;
                        } else {
                            currentDisplayValue = chartData[chartData.length - 1]?.value || 0;
                        }
                    }
                    
                     const getStatus = (value: number) => {
                        const { targetDirection, alert4, alert3, alert2 } = config;
                        if (targetDirection === '>=') {
                            if (value < alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
                            if (value < alert3) return { label: 'Action Required', variant: 'orange' as const };
                            if (value < alert2) return { label: 'Monitor', variant: 'warning' as const };
                            return { label: 'Acceptable', variant: 'success' as const };
                        } else {
                            if (value > alert4) return { label: 'Urgent Action', variant: 'destructive' as const };
                            if (value > alert3) return { label: 'Action Required', variant: 'orange' as const };
                            if (value > alert2) return { label: 'Monitor', variant: 'warning' as const };
                            return { label: 'Acceptable', variant: 'success' as const };
                        }
                    };

                    const status = getStatus(currentDisplayValue);
                    
                    return (
                        <Card key={config.id} className="flex flex-col border shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg leading-tight">{config.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-normal">{config.type}</Badge>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{config.calculation}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={status.variant} className="px-3">
                                            {status.label}
                                        </Badge>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingSpi(config)}>
                                            <Edit className="h-3 w-3 mr-1" /> Targets
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between bg-muted/30 p-2 rounded-md">
                                    <div className="text-center flex-1">
                                        <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                                        <p className="text-lg font-bold">{currentDisplayValue} <span className="text-[10px] font-normal">{config.unit}</span></p>
                                    </div>
                                    <Separator orientation="vertical" className="h-8" />
                                    <div className="text-center flex-1">
                                        <p className="text-[10px] text-muted-foreground uppercase">Target</p>
                                        <p className="text-lg font-bold">{config.targetDirection} {config.target}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {config.calculation === 'rate' ? (
                                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <ReferenceLine y={config.target} stroke="hsl(var(--success))" strokeDasharray="3 3" label={{ value: 'T', position: 'left', fontSize: 10, fill: 'hsl(var(--success))' }} />
                                                <ReferenceLine y={config.alert2} stroke="hsl(var(--warning))" strokeDasharray="3 3" label={{ value: 'A2', position: 'left', fontSize: 10, fill: 'hsl(var(--warning))' }} />
                                                <ReferenceLine y={config.alert3} stroke="hsl(var(--orange))" strokeDasharray="3 3" label={{ value: 'A3', position: 'left', fontSize: 10, fill: 'hsl(var(--orange))' }} />
                                                <ReferenceLine y={config.alert4} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'A4', position: 'left', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
                                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        ) : (
                                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {chartData.map((entry, index) => {
                                                        const entryStatus = getStatus(entry.value);
                                                        const color = {
                                                            'success': 'hsl(var(--success))',
                                                            'warning': 'hsl(var(--warning))',
                                                            'orange': 'hsl(var(--orange))',
                                                            'destructive': 'hsl(var(--destructive))'
                                                        }[entryStatus.variant];
                                                        return <Cell key={`cell-${index}`} fill={color} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </CardContent>
            {editingSpi && (
                <Dialog open={!!editingSpi} onOpenChange={() => setEditingSpi(null)}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Edit Indicator: {editingSpi.name}</DialogTitle>
                            <DialogDescription>
                                Adjust targets and alert levels.
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
    })).sort((a,b) => {
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
                                    return <Cell key={`cell-${index}`} fill={cn(
                                        entry.name === 'Low' && 'hsl(var(--success))',
                                        entry.name === 'Medium' && 'hsl(var(--warning))',
                                        entry.name === 'High' && 'hsl(var(--orange))',
                                        entry.name === 'Extreme' && 'hsl(var(--destructive))',
                                    )} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export function SafetyPageContent({
    initialReports,
    initialRisks,
    initialBookings,
    initialMoc,
}: {
    initialReports: SafetyReport[],
    initialRisks: Risk[],
    initialBookings: Booking[],
    initialMoc: ManagementOfChange[],
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab');

  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(initialReports);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [mocs, setMocs] = useState<ManagementOfChange[]>(initialMoc);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const { user, company } = useUser();
  const { toast } = useToast();
  const [isNewMocOpen, setIsNewMocOpen] = useState(false);
  
  const [spiConfigs, setSpiConfigs] = useState<SpiConfig[]>([]);

  const fetchData = React.useCallback(async () => {
    if (!company) return;
    const { reportsList, risksList, bookingsList, mocList, personnelList, departmentsList } = await getSafetyPageData(company.id);
    setSafetyReports(reportsList);
    setRisks(risksList);
    setBookings(bookingsList);
    setMocs(mocList);
    setPersonnel(personnelList);
    setDepartments(departmentsList);
  }, [company]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!company) return;
    const q = query(collection(db, `companies/${company.id}/spi-configs`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            setSpiConfigs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SpiConfig)));
        } else {
            setSpiConfigs([
                { id: 'unstableApproaches', name: 'Unstable Approach Rate', type: 'Lagging Indicator', calculation: 'count', unit: 'Per Month', targetDirection: '<=', target: 1, alert2: 2, alert3: 3, alert4: 4, filterType: 'Flight Operations Report', filterSubCategory: 'Unstable Approach' },
                { id: 'adr', name: 'Aircraft Technical Defect Rate', type: 'Lagging Indicator', calculation: 'count', unit: 'Per Month', targetDirection: '<=', target: 3, alert2: 4, alert3: 5, alert4: 6, filterType: 'Aircraft Defect Report' },
                { id: 'allIncidentsRate', name: 'All Incidents per 100 Flight Hours', type: 'Lagging Indicator', calculation: 'rate', unit: 'per 100 Flight Hours', targetDirection: '<=', target: 0.5, alert2: 0.75, alert3: 1.0, alert4: 1.25, filterType: 'All' }
            ]);
        }
    });
    return () => unsubscribe();
  }, [company]);

  const handleSpiConfigsChange = async (newConfigs: SpiConfig[]) => {
    if (!company) return;
    setSpiConfigs(newConfigs);
    try {
        const batch = writeBatch(db);
        newConfigs.forEach(config => {
            const ref = doc(db, `companies/${company.id}/spi-configs`, config.id);
            batch.set(ref, config, { merge: true });
        });
        await batch.commit();
    } catch (e) {
        console.error("Failed to save SPI configs:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to persist SPI settings.' });
    }
  };

  const activeReports = useMemo(() => safetyReports.filter(r => r.status !== 'Archived'), [safetyReports]);
  const archivedReports = useMemo(() => safetyReports.filter(r => r.status === 'Archived'), [safetyReports]);

  const reportsControls = useTableControls(activeReports, {
    initialSort: { key: 'filedDate', direction: 'desc' },
    searchKeys: ['reportNumber', 'heading', 'details', 'department'],
  });
  
  const archivedReportsControls = useTableControls(archivedReports, {
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
        fetchData();
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
        await updateDoc(reportRef, { status: 'Open' });
        fetchData();
        toast({ title: 'Report Reactivated', description: 'The safety report has been moved back to active reports.' });
    } catch (error) {
        console.error(`Error updating report status:`, error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not reactivate the report.'
        });
    }
  };

  const monthlyFlightHours = useMemo(() => bookings
    .filter(b => b.status === 'Completed' && b.flightDuration)
    .reduce((acc, booking) => {
        const month = format(startOfMonth(parseISO(booking.date)), 'MMM yy');
        acc[month] = (acc[month] || 0) + booking.flightDuration!;
        return acc;
    }, {} as Record<string, number>), [bookings]);


  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof SafetyReport | keyof Risk }) => {
    const controls = reportsControls;
    return (
        <Button variant="ghost" onClick={() => controls.requestSort(sortKey as any)}>
            {label}
            {controls.sortConfig?.key === sortKey ? (
                <ArrowUpDown className={cn("ml-2 h-4 w-4", controls.sortConfig.direction === 'asc' ? '' : 'rotate-180')} />
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />
            )}
        </Button>
    );
  };
  
  const ReportTable = ({ reports: reportList, isArchivedTable = false }: { reports: SafetyReport[], isArchivedTable?: boolean }) => {
    const controls = isArchivedTable ? archivedReportsControls : reportsControls;

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
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
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
                        {isArchivedTable ? (
                             <DropdownMenuItem onClick={() => handleReactivateReport(report.id)}>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Reactivate
                            </DropdownMenuItem>
                        ) : (
                             <DropdownMenuItem onClick={() => handleArchiveReport(report.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
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
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </>
    );
  };
  
  const MocTable = ({ mocs, canEdit, onDelete }: { mocs: ManagementOfChange[], canEdit: boolean, onDelete: (id: string) => void }) => {
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>MOC #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Proposed By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mocs.length > 0 ? (
                        mocs.map(moc => (
                            <TableRow key={moc.id}>
                                <TableCell>{moc.mocNumber}</TableCell>
                                <TableCell>{moc.title}</TableCell>
                                <TableCell>{moc.proposedBy}</TableCell>
                                <TableCell>{format(parseISO(moc.proposalDate), 'MMM d, yyyy')}</TableCell>
                                <TableCell><Badge>{moc.status}</Badge></TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/safety/moc/${moc.id}`}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            View
                                        </Link>
                                    </Button>
                                    {canEdit && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the MOC record "{moc.title}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(moc.id)}>
                                                        Yes, Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No Management of Change records found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
  }

  const handleDeleteMoc = async (mocId: string) => {
    if (!company) return;
    try {
        const docRef = doc(db, `companies/${company.id}/management-of-change`, mocId);
        await deleteDoc(docRef);
        fetchData();
        toast({ title: 'MOC Deleted', description: 'The MOC record has been removed.'});
    } catch (error) {
        console.error("Error deleting MOC:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete MOC record.' });
    }
  };

  const canEditMoc = user?.permissions.includes('MOC:Edit') || user?.permissions.includes('Super User');

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 no-print">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="reports">Safety Reports</TabsTrigger>
                    <TabsTrigger value="register">Risk Register</TabsTrigger>
                    <TabsTrigger value="spis">SPIs</TabsTrigger>
                    <TabsTrigger value="moc">MOC</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          <TabsContent value="dashboard">
            <SafetyDashboard reports={safetyReports} risks={risks} />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Filed Safety Reports</CardTitle>
                    <CardDescription>Incidents and hazards reported by personnel.</CardDescription>
                  </div>
                  <Button asChild>
                    <Link href="/safety/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        File New Report
                    </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active">
                    <TabsList>
                        <TabsTrigger value="active">Active Reports ({activeReports.length})</TabsTrigger>
                        <TabsTrigger value="archived">Archived Reports ({archivedReports.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                        <ReportTable reports={activeReports} />
                    </TabsContent>
                    <TabsContent value="archived">
                        <ReportTable reports={archivedReports} isArchivedTable />
                    </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <RiskRegister risks={risks} onUpdate={fetchData} />
          </TabsContent>
          <TabsContent value="spis" className="mt-4">
            <SafetyPerformanceIndicators 
                reports={safetyReports} 
                spiConfigs={spiConfigs} 
                onConfigChange={handleSpiConfigsChange} 
                monthlyFlightHours={monthlyFlightHours}
            />
          </TabsContent>
           <TabsContent value="moc">
              <Card>
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <CardTitle>Management of Change (MOC)</CardTitle>
                      <CardDescription>
                      Track and manage significant changes to operations, procedures, and systems.
                      </CardDescription>
                  </div>
                   <Dialog open={isNewMocOpen} onOpenChange={setIsNewMocOpen}>
                      <DialogTrigger asChild>
                          <Button>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Propose Change
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl">
                          <DialogHeader>
                              <DialogTitle>Management of Change Proposal</DialogTitle>
                              <DialogDescription>
                                  Submit a new proposal for a significant change to operations.
                              </DialogDescription>
                          </DialogHeader>
                          <NewMocForm onClose={() => setIsNewMocOpen(false)} onUpdate={fetchData} personnel={personnel} departments={departments} />
                      </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <MocTable mocs={mocs} canEdit={canEditMoc} onDelete={handleDeleteMoc} />
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </main>
  );
}