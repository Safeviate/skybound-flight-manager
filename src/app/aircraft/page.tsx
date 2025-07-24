
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft, Booking, Checklist, ChecklistItem, SafetyReport } from '@/lib/types';
import { ClipboardCheck, PlusCircle, QrCode, Edit, Save, Wrench, Settings } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCard } from '../checklists/checklist-card';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChecklistsManager } from '../checklists/page';

function AircraftPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fleet, setFleet] = useState<Aircraft[]>([]);
  const [editingHobbsId, setEditingHobbsId] = useState<string | null>(null);
  const [hobbsInputValue, setHobbsInputValue] = useState<number>(0);
  const { toast } = useToast();
  const { user, company, loading } = useUser();
  const router = useRouter();
  const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
  const [isChecklistManagerOpen, setIsChecklistManagerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (company) {
        fetchData();
    }
  }, [user, company, loading, router]);

  const fetchData = async () => {
      if (!company) return;
      try {
          const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
          const aircraftSnapshot = await getDocs(aircraftQuery);
          const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
          setFleet(aircraftList);

          // Now fetching assigned checklists, not templates
          const checklistQuery = query(collection(db, `companies/${company.id}/checklists`));
          const checklistSnapshot = await getDocs(checklistQuery);
          const checklistList = checklistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
          setChecklists(checklistList);

          const bookingQuery = query(collection(db, `companies/${company.id}/bookings`));
          const bookingSnapshot = await getDocs(bookingQuery);
          const bookingList = bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
          setBookings(bookingList);
      } catch (error) {
          console.error("Error fetching data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch initial data.'});
      }
  };
  
  const canUpdateHobbs = user?.permissions.includes('Aircraft:UpdateHobbs') || user?.permissions.includes('Super User');

  const handleItemToggle = async (toggledChecklist: Checklist) => {
    setChecklists(prev => prev.map(c => c.id === toggledChecklist.id ? toggledChecklist : c));
  };
  
  const handleItemValueChange = (checklistId: string, itemId: string, value: string) => {
    setChecklists(prev => {
        return prev.map(c => {
            if (c.id === checklistId) {
                const newItems = c.items.map(item => item.id === itemId ? { ...item, value } : item);
                return { ...c, items: newItems };
            }
            return c;
        });
    });
  };

  const handleChecklistUpdate = async (updatedChecklist: Checklist) => {
    if (!company) return;

    // Persist the final state of the checklist
    const checklistRef = doc(db, `companies/${company.id}/checklists`, updatedChecklist.id);
    await updateDoc(checklistRef, { items: updatedChecklist.items });

    const isComplete = updatedChecklist.items.every(item => item.completed);
    if (!isComplete || !updatedChecklist.aircraftId) return;
    
    const aircraft = fleet.find(ac => ac.id === updatedChecklist.aircraftId);
    if (!aircraft) return;

    try {
        if (updatedChecklist.category === 'Pre-Flight') {
            const bookingQuery = query(
                collection(db, `companies/${company.id}/bookings`),
                where('aircraft', '==', aircraft.tailNumber),
                where('status', '==', 'Approved')
            );
            const bookingSnapshot = await getDocs(bookingQuery);
            bookingSnapshot.forEach(async (bookingDoc) => {
                await updateDoc(bookingDoc.ref, { isChecklistComplete: true });
            });
            setBookings(prev => prev.map(b => b.aircraft === aircraft.tailNumber && b.status === 'Approved' ? {...b, isChecklistComplete: true} : b));
        }
         toast({
            title: "Checklist Complete",
            description: `Checklist "${updatedChecklist.title}" submitted.`,
        });

    } catch (error) {
        console.error("Error updating checklist state:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete checklist action.' });
    }
  };
  
  const handleReset = async (checklistId: string) => {
    const checklistToReset = checklists.find(c => c.id === checklistId);
    if (!checklistToReset) return;

    const resetItems = checklistToReset.items.map(item => ({...item, completed: false, value: ''}));
    const updatedChecklist = {...checklistToReset, items: resetItems };

    setChecklists(prev => prev.map(c => c.id === checklistId ? updatedChecklist : c));

    if (!company) return;
    const checklistRef = doc(db, `companies/${company.id}/checklists`, checklistId);
    await updateDoc(checklistRef, { items: resetItems });

  };

  const handleEditHobbs = (aircraft: Aircraft) => {
    setEditingHobbsId(aircraft.id);
    setHobbsInputValue(aircraft.hours);
  };
  
  const handleSaveHobbs = async (aircraftId: string) => {
      if (!company) return;
      try {
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraftId);
        await updateDoc(aircraftRef, { hours: hobbsInputValue });
        setFleet(prevFleet =>
            prevFleet.map(ac =>
                ac.id === aircraftId ? { ...ac, hours: hobbsInputValue } : ac
            )
        );
        const updatedAircraft = fleet.find(ac => ac.id === aircraftId);
        toast({
            title: "Hobbs Hours Updated",
            description: `Hobbs hours for ${updatedAircraft?.tailNumber} set to ${hobbsInputValue.toFixed(1)}.`,
        });
        setEditingHobbsId(null);
      } catch (error) {
          console.error("Error saving Hobbs hours:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not update Hobbs hours.' });
      }
  };
  
  const getStatusVariant = (status: Aircraft['status']) => {
    switch (status) {
      case 'Available':
        return 'success';
      case 'In Maintenance':
        return 'destructive';
      case 'Booked':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleAircraftAdded = (newAircraft: Aircraft) => {
    setFleet(prev => [...prev, newAircraft]);
    setIsNewAircraftDialogOpen(false);
    fetchData(); // Refetch all data to get newly assigned checklists
  }

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }
  
  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aircraft Fleet</CardTitle>
            <div className="flex items-center gap-2">
                <Dialog open={isChecklistManagerOpen} onOpenChange={setIsChecklistManagerOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Checklist Templates
                        </Button>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                        <ChecklistsManager aircraftList={fleet} refetchData={fetchData} />
                    </DialogContent>
                </Dialog>
                <Dialog open={isNewAircraftDialogOpen} onOpenChange={setIsNewAircraftDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Aircraft
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New Aircraft</DialogTitle>
                            <DialogDescription>
                                Fill out the form below to add a new aircraft to the fleet.
                            </DialogDescription>
                        </DialogHeader>
                        <NewAircraftForm onAircraftAdded={handleAircraftAdded} />
                    </DialogContent>
                </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hobbs Hours</TableHead>
                  <TableHead>Airworthiness Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Checklists</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.map((aircraft) => {
                  const aircraftChecklists = checklists.filter(c => c.aircraftId === aircraft.id);
                  const isEditing = editingHobbsId === aircraft.id;

                  return (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium">
                      <Link href={`/aircraft/${aircraft.id}`} className="hover:underline">
                        {aircraft.tailNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{aircraft.model}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>
                    </TableCell>
                    <TableCell>
                        {isEditing && canUpdateHobbs ? (
                             <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={hobbsInputValue}
                                    onChange={(e) => setHobbsInputValue(parseFloat(e.target.value))}
                                    className="w-24 h-8"
                                />
                                <Button size="icon" className="h-8 w-8" onClick={() => handleSaveHobbs(aircraft.id)}>
                                    <Save className="h-4 w-4" />
                                </Button>
                             </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {aircraft.hours.toFixed(1)}
                                {canUpdateHobbs && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditHobbs(aircraft)}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </TableCell>
                    <TableCell>{getExpiryBadge(aircraft.airworthinessExpiry)}</TableCell>
                    <TableCell>{getExpiryBadge(aircraft.insuranceExpiry)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                    View ({aircraftChecklists.length})
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Available Checklists</DropdownMenuLabel>
                                {aircraftChecklists.length > 0 ? (
                                    aircraftChecklists.map(checklist => (
                                        <Dialog key={checklist.id}>
                                            <DialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    {checklist.title}
                                                </DropdownMenuItem>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
                                                <DialogHeader>
                                                    <DialogTitle>{checklist.title}</DialogTitle>
                                                </DialogHeader>
                                                <ChecklistCard 
                                                    checklist={checklist}
                                                    aircraft={aircraft}
                                                    onItemToggle={handleItemToggle}
                                                    onItemValueChange={handleItemValueChange}
                                                    onUpdate={handleChecklistUpdate}
                                                    onReset={handleReset}
                                                    onEdit={() => {}}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>No checklists assigned</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <QrCode className="h-4 w-4" />
                                    <span className="sr-only">Show QR Code</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xs">
                            <DialogHeader>
                                <DialogTitle>Checklist for {aircraft.tailNumber}</DialogTitle>
                                <DialogDescription>
                                    Scan this code with the in-app scanner to start the pre-flight checklist.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-4">
                                <QRCode value={aircraft.id} size={200} />
                            </div>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
  );
}

AircraftPage.title = 'Aircraft Management';
export default AircraftPage;
