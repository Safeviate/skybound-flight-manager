
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
import { ClipboardCheck, PlusCircle, QrCode, Edit, Save, Wrench, Settings, Database, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChecklistCard } from '@/app/checklists/checklist-card';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { aircraftData as seedAircraft } from '@/lib/data-provider';
import { useSettings } from '@/context/settings-provider';

async function getAircraftPageData(companyId: string) {
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    const checklistQuery = query(collection(db, `companies/${companyId}/checklists`));
    const bookingQuery = query(collection(db, `companies/${companyId}/bookings`));

    const [aircraftSnapshot, checklistSnapshot, bookingSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(checklistQuery),
        getDocs(bookingQuery)
    ]);
    
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const checklistList = checklistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
    const bookingList = bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    return { aircraftList, checklistList, bookingList };
}


function AircraftPageContent({
    initialFleet, 
    initialChecklists, 
    initialBookings
}: {
    initialFleet: Aircraft[], 
    initialChecklists: Checklist[], 
    initialBookings: Booking[]
}) {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [fleet, setFleet] = useState<Aircraft[]>(initialFleet);
  const [editingHobbsId, setEditingHobbsId] = useState<string | null>(null);
  const [hobbsInputValue, setHobbsInputValue] = useState<number>(0);
  const { toast } = useToast();
  const { user, company, loading } = useUser();
  const { settings } = useSettings();
  const router = useRouter();
  const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchData = async () => {
      if (!company) return;
      try {
          const { aircraftList, checklistList, bookingList } = await getAircraftPageData(company.id);
          setFleet(aircraftList);
          setChecklists(checklistList);
          setBookings(bookingList);
      } catch (error) {
          console.error("Error fetching data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch initial data.'});
      }
  };
  
  const canUpdateHobbs = user?.permissions.includes('Aircraft:UpdateHobbs') || user?.permissions.includes('Super User');
  const canEditAircraft = user?.permissions.includes('Aircraft:Edit') || user?.permissions.includes('Super User');

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
  
  const handleDeleteAircraft = async (aircraftId: string) => {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.' });
      return;
    }

    try {
      await deleteDoc(doc(db, `companies/${company.id}/aircraft`, aircraftId));
      setFleet(prev => prev.filter(ac => ac.id !== aircraftId));
      toast({
        title: 'Aircraft Deleted',
        description: 'The aircraft has been removed from the fleet.',
      });
    } catch (error) {
      console.error('Error deleting aircraft:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete aircraft.' });
    }
  };

  const handleSeedAircraft = async () => {
    if (!company) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No company selected. Cannot seed aircraft data.',
      });
      return;
    }

    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const aircraftCollectionRef = collection(db, `companies/${company.id}/aircraft`);
      // Use getDocs to check for existing aircraft to avoid duplicates if seed is run multiple times
      const existingSnapshot = await getDocs(aircraftCollectionRef);
      const existingIds = new Set(existingSnapshot.docs.map(d => d.id));

      const aircraftToSeed = seedAircraft.filter(ac => ac.companyId === 'skybound-aero' && !existingIds.has(ac.id));
      
      if (aircraftToSeed.length === 0) {
        toast({
            variant: 'default',
            title: 'No New Aircraft to Seed',
            description: 'Sample aircraft already exist in your fleet.',
        });
        setIsSeeding(false);
        return;
      }


      aircraftToSeed.forEach(aircraft => {
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        batch.set(aircraftRef, { ...aircraft, companyId: company.id });
      });

      await batch.commit();

      toast({
        title: 'Aircraft Seeded',
        description: `${aircraftToSeed.length} sample aircraft have been added to your fleet.`,
      });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error seeding aircraft:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: 'An error occurred while trying to seed aircraft data.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Aircraft Fleet</CardTitle>
          <div className="flex items-center gap-2">
              <Button onClick={handleSeedAircraft} variant="outline" disabled={isSeeding}>
                  {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Seed Sample Fleet
              </Button>
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
                  <TableCell>{getExpiryBadge(aircraft.airworthinessExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</TableCell>
                  <TableCell>{getExpiryBadge(aircraft.insuranceExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</TableCell>
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
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <Dialog>
                                  <DialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                          <QrCode className="mr-2 h-4 w-4" />
                                          Show QR Code
                                      </DropdownMenuItem>
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
                              {canEditAircraft && (
                                   <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                          </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete {aircraft.tailNumber} and all its associated data.
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteAircraft(aircraft.id)}>Yes, Delete Aircraft</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
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

export default async function AircraftPageContainer() {
    // This is a server-side wrapper to fetch data
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const { aircraftList, checklistList, bookingList } = await getAircraftPageData(companyId);

    return (
        <AircraftPageContent 
            initialFleet={aircraftList} 
            initialChecklists={checklistList} 
            initialBookings={bookingList} 
        />
    )
}

AircraftPageContainer.title = 'Aircraft Management';
