
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
import type { Aircraft, Checklist } from '@/lib/types';
import { ClipboardCheck, PlusCircle, QrCode, Edit, Trash2, MoreHorizontal, Save } from 'lucide-react';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-provider';
import { ChecklistTemplateManager } from '../checklists/checklist-template-manager';
import { ChecklistCard } from '../checklists/checklist-card';
import { getAircraftPageData } from './data';


export function AircraftPageContent({
    initialFleet, 
    initialChecklists,
}: {
    initialFleet: Aircraft[], 
    initialChecklists: Checklist[],
}) {
  const [fleet, setFleet] = useState<Aircraft[]>(initialFleet);
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists);
  const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
  const [editingHobbsId, setEditingHobbsId] = useState<string | null>(null);
  const [hobbsInputValue, setHobbsInputValue] = useState<number>(0);
  
  const { user, company, loading } = useUser();
  const { settings } = useSettings();
  const { toast } = useToast();

  useEffect(() => {
    setFleet(initialFleet);
    setChecklists(initialChecklists);
  }, [initialFleet, initialChecklists]);

  const canUpdateHobbs = user?.permissions.includes('Aircraft:UpdateHobbs') || user?.permissions.includes('Super User');
  const canEditAircraft = user?.permissions.includes('Aircraft:Edit') || user?.permissions.includes('Super User');
  const canEditChecklists = user?.permissions.includes('Checklists:Edit') || user?.permissions.includes('Super User');
  
  const refreshData = async () => {
    if (!company) return;
    try {
        const { aircraftList, checklistList } = await getAircraftPageData(company.id);
        setFleet(aircraftList);
        setChecklists(checklistList);
    } catch (error) {
        console.error("Error refreshing data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh aircraft data.'});
    }
  };

  const handleAircraftAdded = () => {
    setIsNewAircraftDialogOpen(false);
    refreshData();
  };

  const handleDeleteAircraft = async (aircraftId: string) => {
    if (!company) return;
    try {
      await deleteDoc(doc(db, `companies/${company.id}/aircraft`, aircraftId));
      refreshData();
      toast({
        title: 'Aircraft Deleted',
        description: 'The aircraft has been removed from the fleet.',
      });
    } catch (error) {
      console.error('Error deleting aircraft:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete aircraft.' });
    }
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
        await refreshData();
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
      case 'Available': return 'success';
      case 'In Maintenance': return 'destructive';
      case 'Booked': return 'secondary';
      default: return 'outline';
    }
  };
  
  const handleChecklistUpdate = async () => {
      // This will eventually link to completing a checklist and updating aircraft status
      await refreshData();
      toast({ title: "Checklist submitted (simulation)" });
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Manage Fleet</CardTitle>
                <CardDescription>Add new aircraft or manage global checklist templates.</CardDescription>
            </div>
          <div className="flex items-center gap-2">
             {canEditChecklists && <ChecklistTemplateManager onUpdate={refreshData} />}
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
      </Card>
      
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
                                              onItemToggle={(updated) => setChecklists(prev => prev.map(c => c.id === updated.id ? updated : c))}
                                              onItemValueChange={(checklistId, itemId, value) => { /* handle value change if needed */ }}
                                              onUpdate={handleChecklistUpdate}
                                              onReset={(checklistId) => { /* handle reset */ }}
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
                                          This action cannot be undone. This will permanently delete {aircraft.tailNumber}.
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteAircraft(aircraft.id)}>Yes, Delete</AlertDialogAction>
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
    </main>
  );
}
