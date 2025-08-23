
'use client';

import { useMemo, useEffect, useState } from 'react';
import type { Booking, Aircraft, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, parseISO, startOfMonth, getDay, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Calendar, Check, Plane, Users, Clock, AlertTriangle, Search, Loader2, Fuel, Droplets, Archive } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';


const AircraftUtilizationChart = ({ bookings, aircraft }: { bookings: Booking[], aircraft: Aircraft[] }) => {
  const utilizationData = useMemo(() => {
    // 1. Create a map of all active aircraft, initialized to 0 hours.
    const hoursByAircraft = new Map<string, number>();
    aircraft.forEach(ac => {
        if (ac.status !== 'Archived') {
            hoursByAircraft.set(ac.tailNumber, 0);
        }
    });

    // 2. Add flight hours from bookings to the map.
    bookings.forEach(booking => {
        if (booking.aircraft && hoursByAircraft.has(booking.aircraft) && booking.status !== 'Cancelled' && booking.flightDuration) {
            const currentHours = hoursByAircraft.get(booking.aircraft) || 0;
            hoursByAircraft.set(booking.aircraft, currentHours + booking.flightDuration);
        }
    });

    // 3. Convert the map to the format required by the chart.
    return Array.from(hoursByAircraft.entries()).map(([name, hours]) => ({
      name,
      'Flight Hours': parseFloat(hours.toFixed(1)),
    })).sort((a, b) => b['Flight Hours'] - a['Flight Hours']);
  }, [bookings, aircraft]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={utilizationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" unit="h" />
        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          }}
          formatter={(value) => `${value} hrs`}
        />
        <Legend />
        <Bar dataKey="Flight Hours" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const InstructorHoursChart = ({ bookings, users }: { bookings: Booking[], users: User[] }) => {
    const instructorData = useMemo(() => {
        const hoursByInstructor = bookings.reduce((acc, booking) => {
            if (booking.instructor && booking.status !== 'Cancelled' && booking.flightDuration) {
                acc[booking.instructor] = (acc[booking.instructor] || 0) + booking.flightDuration;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(hoursByInstructor).map(([name, hours]) => ({
            name,
            'Flight Hours': parseFloat(hours.toFixed(1))
        })).sort((a,b) => b['Flight Hours'] - a['Flight Hours']);

    }, [bookings]);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={instructorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => `${value} hrs`} />
                <Legend />
                <Bar dataKey="Flight Hours" fill="hsl(var(--primary))" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const BookingsOverTimeChart = ({ bookings }: { bookings: Booking[] }) => {
    const data = useMemo(() => {
        const bookingsByMonth = bookings.reduce((acc, booking) => {
            const month = format(startOfMonth(parseISO(booking.date)), 'MMM yy');
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.keys(bookingsByMonth).map(month => ({
            name: month,
            Bookings: bookingsByMonth[month]
        })).reverse(); // Show most recent months first
    }, [bookings]);
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Bookings" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

const BookingPurposeChart = ({ bookings }: { bookings: Booking[] }) => {
    const data = useMemo(() => {
        const purposeCounts = bookings.reduce((acc, booking) => {
            if(booking.status !== 'Cancelled') {
                acc[booking.purpose] = (acc[booking.purpose] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(purposeCounts).map(([name, value]) => ({ name, value }));
    }, [bookings]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};


const CancellationReasonChart = ({ bookings }: { bookings: Booking[] }) => {
    const cancellationData = useMemo(() => {
        const reasons = bookings
            .filter(b => b.status === 'Cancelled' && b.cancellationReason)
            .reduce((acc, booking) => {
                const reason = booking.cancellationReason!.split(':')[0].trim();
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
        
        return Object.entries(reasons).map(([name, value]) => ({ name, value }));

    }, [bookings]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={cancellationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {cancellationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                 <Tooltip />
                 <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

const KeyMetrics = ({ bookings }: { bookings: Booking[] }) => {
    const metrics = useMemo(() => {
        const totalBookings = bookings.length;
        const completedFlights = bookings.filter(b => b.status === 'Completed').length;
        const cancelledFlights = bookings.filter(b => b.status === 'Cancelled').length;
        const totalFlightHours = bookings.reduce((sum, b) => b.status === 'Completed' ? sum + (b.flightDuration || 0) : sum, 0);
        
        const cancellationRate = totalBookings > 0 ? (cancelledFlights / totalBookings) * 100 : 0;
        const avgDuration = completedFlights > 0 ? totalFlightHours / completedFlights : 0;

        return {
            totalBookings,
            completedFlights,
            cancelledFlights,
            totalFlightHours: totalFlightHours.toFixed(1),
            cancellationRate: cancellationRate.toFixed(1),
            avgDuration: avgDuration.toFixed(1)
        }
    }, [bookings]);

    return (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.totalBookings}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Flights</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.completedFlights}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Flight Hours</CardTitle>
                    <Plane className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.totalFlightHours}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.avgDuration} hrs</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancelled Bookings</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.cancelledFlights}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.cancellationRate}%</div></CardContent>
            </Card>
        </div>
    )
}

const AircraftStats = ({ bookings, aircraftData }: { bookings: Booking[], aircraftData: Aircraft[] }) => {
  const stats = useMemo(() => {
    const totalFlightHours = aircraftData.reduce((sum, ac) => sum + ac.hours, 0);
    const totalBookings = bookings.length;
    const totalFuelUplift = bookings.reduce((sum, b) => sum + (b.fuelUplift || 0), 0);
    const totalOilUplift = bookings.reduce((sum, b) => sum + (b.oilUplift || 0), 0);
    
    return {
      totalFlightHours: totalFlightHours.toFixed(1),
      totalBookings,
      totalFuelUplift: totalFuelUplift.toFixed(1),
      totalOilUplift: totalOilUplift.toFixed(1),
    }
  }, [bookings, aircraftData]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hours Flown</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{stats.totalFlightHours}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fuel Uplift</CardTitle>
          <Fuel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{stats.totalFuelUplift} L</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Oil Uplift</CardTitle>
          <Droplets className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{stats.totalOilUplift} qts</div></CardContent>
      </Card>
    </div>
  );
};


const IndividualAircraftStats = ({ bookings, aircraftData }: { bookings: Booking[], aircraftData: Aircraft[] }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight my-4">Individual Aircraft Statistics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {aircraftData.filter(ac => ac.status !== 'Archived').map(aircraft => {
                    const aircraftBookings = bookings.filter(b => b.aircraft === aircraft.tailNumber);
                    const totalHours = aircraftBookings.reduce((sum, b) => sum + (b.flightDuration || 0), 0);
                    const totalBookings = aircraftBookings.length;
                    const totalFuel = aircraftBookings.reduce((sum, b) => sum + (b.fuelUplift || 0), 0);
                    const totalOil = aircraftBookings.reduce((sum, b) => sum + (b.oilUplift || 0), 0);
                    
                    return (
                        <Card key={aircraft.id}>
                            <CardHeader>
                                <CardTitle>{aircraft.tailNumber}</CardTitle>
                                <CardDescription>{aircraft.make} {aircraft.model}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Hours Flown</span>
                                    <span>{totalHours.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Bookings</span>
                                    <span>{totalBookings}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Fuel Uplift</span>
                                    <span>{totalFuel.toFixed(1)} L</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Oil Uplift</span>
                                    <span>{totalOil.toFixed(1)} qts</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};


interface ReportsPageContentProps {
  initialBookings: Booking[];
  initialAircraft: Aircraft[];
  initialUsers: User[];
}

export function ReportsPageContent({
    initialBookings,
    initialAircraft,
    initialUsers
}: ReportsPageContentProps) {
  const { user, company, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [bookingData, setBookingData] = useState<Booking[]>(initialBookings);
  const [aircraftData, setAircraftData] = useState<Aircraft[]>(initialAircraft);
  const [userData, setUserData] = useState<User[]>(initialUsers);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

  useEffect(() => {
    setBookingData(initialBookings);
    setAircraftData(initialAircraft);
    setUserData(initialUsers);
    setDataLoading(false);
  }, [initialBookings, initialAircraft, initialUsers]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    // Clear selections when the search term changes
    setSelectedBookings([]);
  }, [searchTerm]);

  const recentBookings = useMemo(() => {
    return bookingData
      .filter(b => b.bookingNumber && b.status !== 'Archived') // Filter out archived bookings
      .sort((a, b) => {
        const numA = parseInt(a.bookingNumber!.split('-')[1]);
        const numB = parseInt(b.bookingNumber!.split('-')[1]);
        return numB - numA; // Sort descending
      });
  }, [bookingData]);

  const filteredBookings = useMemo(() => {
      if (!searchTerm) return recentBookings;
      const lowercasedFilter = searchTerm.toLowerCase();
      return recentBookings.filter(booking => {
          return (
              booking.bookingNumber?.toLowerCase().includes(lowercasedFilter) ||
              booking.aircraft.toLowerCase().includes(lowercasedFilter) ||
              booking.purpose.toLowerCase().includes(lowercasedFilter) ||
              booking.student?.toLowerCase().includes(lowercasedFilter) ||
              booking.instructor?.toLowerCase().includes(lowercasedFilter) ||
              booking.status.toLowerCase().includes(lowercasedFilter)
          );
      });
  }, [searchTerm, recentBookings]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'warning';
      case 'Completed': return 'success';
      case 'Cancelled': return 'destructive';
      case 'Archived': return 'secondary';
      default: return 'outline';
    }
  }
  
  const handleSelectAll = (checked: boolean) => {
      if (checked) {
          setSelectedBookings(filteredBookings.map(b => b.id));
      } else {
          setSelectedBookings([]);
      }
  }

  const handleSelectOne = (bookingId: string, checked: boolean) => {
      if (checked) {
          setSelectedBookings(prev => [...prev, bookingId]);
      } else {
          setSelectedBookings(prev => prev.filter(id => id !== bookingId));
      }
  }

  const handleArchiveSelected = async () => {
    if (!company || selectedBookings.length === 0) return;

    const batch = writeBatch(db);
    selectedBookings.forEach(bookingId => {
        const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingId);
        batch.update(bookingRef, { status: 'Archived' });
    });

    try {
        await batch.commit();
        setBookingData(prev => prev.map(b => selectedBookings.includes(b.id) ? { ...b, status: 'Archived' } : b));
        setSelectedBookings([]);
        toast({
            title: 'Bookings Archived',
            description: `${selectedBookings.length} booking(s) have been successfully archived.`
        });
    } catch (error) {
        console.error("Error archiving bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive selected bookings.' });
    }
  };


  if (loading || dataLoading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Loading reports...</p>
        </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
        <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Charts & Overview</TabsTrigger>
                <TabsTrigger value="bookings">Recent Bookings Log</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-8">
                 <KeyMetrics bookings={bookingData} />
                 <AircraftStats bookings={bookingData} aircraftData={aircraftData} />
                 <IndividualAircraftStats bookings={bookingData} aircraftData={aircraftData} />
                 <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bookings Over Time</CardTitle>
                            <CardDescription>Number of bookings created per month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BookingsOverTimeChart bookings={bookingData} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Aircraft Utilization</CardTitle>
                            <CardDescription>Total flight hours per aircraft.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AircraftUtilizationChart bookings={bookingData} aircraft={aircraftData} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Instructor Hours</CardTitle>
                            <CardDescription>Total flight hours per instructor.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InstructorHoursChart bookings={bookingData} users={userData} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Booking Purpose</CardTitle>
                            <CardDescription>Breakdown of bookings by their purpose.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BookingPurposeChart bookings={bookingData} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Cancellation Reasons</CardTitle>
                            <CardDescription>Breakdown of reasons for cancelled bookings.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CancellationReasonChart bookings={bookingData} />
                        </CardContent>
                    </Card>
                 </div>
            </TabsContent>
            <TabsContent value="bookings" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                        <CardDescription>A log of all flights in the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between py-4">
                          <div className="relative w-full max-w-sm">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                              placeholder="Search bookings..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                              />
                          </div>
                          {selectedBookings.length > 0 && (
                            <Button variant="outline" onClick={handleArchiveSelected}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive Selected ({selectedBookings.length})
                            </Button>
                          )}
                        </div>
                        <ScrollArea className="h-[70vh]">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                     <Checkbox 
                                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                        checked={selectedBookings.length > 0 && selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Booking #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Aircraft</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Fuel Uplift</TableHead>
                                <TableHead>Oil Uplift</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reason for Cancellation</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredBookings.length > 0 ? (
                                filteredBookings.map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedBookings.includes(booking.id)}
                                            onCheckedChange={(checked) => handleSelectOne(booking.id, !!checked)}
                                            aria-label="Select row"
                                        />
                                    </TableCell>
                                    <TableCell>{booking.bookingNumber}</TableCell>
                                    <TableCell>{format(parseISO(booking.date), 'PPP')}</TableCell>
                                    <TableCell>{booking.aircraft}</TableCell>
                                    <TableCell>{booking.purpose}</TableCell>
                                    <TableCell>
                                        {booking.purpose === 'Training' && `${booking.student} w/ ${booking.instructor}`}
                                        {booking.purpose === 'Private' && `Pilot: ${booking.student}`}
                                        {booking.purpose === 'Maintenance' && booking.maintenanceType}
                                    </TableCell>
                                    <TableCell>{booking.flightDuration ? `${booking.flightDuration.toFixed(1)} hrs` : 'N/A'}</TableCell>
                                    <TableCell>{booking.fuelUplift ? `${booking.fuelUplift.toFixed(1)} L` : 'N/A'}</TableCell>
                                    <TableCell>{booking.oilUplift ? `${booking.oilUplift.toFixed(1)} qts` : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                                    </TableCell>
                                    <TableCell>{booking.cancellationReason || 'N/A'}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={11} className="text-center h-24">No recent bookings found.</TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </main>
  );
}
