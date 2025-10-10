
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertTriangle, Info, ChevronRight, PlusCircle, Users, MoreHorizontal, Trash2, Check, Edit, Printer, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Alert, User, AlertAcknowledgement, Department } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { NewAlertForm } from './new-alert-form';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, limit, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';

const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

export function AlertsPageContent({ initialAlerts, allUsers }: { initialAlerts: Alert[], allUsers: User[] }) {
  const { user, company, loading, getUnacknowledgedAlerts } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach(u => {
        map.set(u.id, u.name);
    });
    return map;
  }, [allUsers]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);
  
  const canCreateAlerts = user?.permissions.includes('Super User') || user?.permissions.includes('Alerts:Edit');
  
  const handleOpenEditDialog = (alert: Alert) => {
    setEditingAlert(alert);
    setIsDialogOpen(true);
  };

  const handleAlertSubmit = async (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => {
    if (!user || !company) return;

    try {
      if (editingAlert) {
        const alertRef = doc(db, 'companies', company.id, 'alerts', editingAlert.id);
        await updateDoc(alertRef, data as any);
        setAlerts(prev => prev.map(a => a.id === editingAlert.id ? { ...a, ...data } as Alert : a));
        toast({
            title: 'Alert Updated',
            description: `The "${data.title}" alert has been updated.`,
        });
      } else {
        const alertsCollection = collection(db, 'companies', company.id, 'alerts');
        
        const q = query(
            alertsCollection, 
            where('type', '==', data.type), 
            orderBy('number', 'desc'), 
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        const lastAlert = querySnapshot.empty ? null : querySnapshot.docs[0].data() as Alert;
        const newAlertNumber = (lastAlert?.number || 0) + 1;

        const newAlertData: Omit<Alert, 'id'> = {
            ...data,
            companyId: company.id,
            number: newAlertNumber,
            author: user.name,
            date: new Date().toISOString(),
            readBy: [],
        };

        const docRef = await addDoc(alertsCollection, newAlertData);
        setAlerts(prev => [{ ...newAlertData, id: docRef.id } as Alert, ...prev]);
        toast({
            title: 'Alert Created',
            description: `The "${data.title}" alert has been issued.`,
        });

        if (newAlertData.reviewerId) {
            const reviewerName = userMap.get(newAlertData.reviewerId) || 'the reviewer';
            toast({
                title: 'Reviewer Notified',
                description: `A task has been assigned to ${reviewerName}.`,
            });
        }
      }
        
      setIsDialogOpen(false);
      setEditingAlert(null);
    } catch (error) {
        console.error("Error saving alert:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to save the alert in the database.'
        });
    }
  }

  const handleSaveProgress = async (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => {
    if (!user || !company) return;

    try {
        const alertsCollection = collection(db, 'companies', company.id, 'alerts');
        const q = query(alertsCollection, where('type', '==', data.type), orderBy('number', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        const lastAlert = querySnapshot.empty ? null : querySnapshot.docs[0].data() as Alert;
        const newAlertNumber = (lastAlert?.number || 0) + 1;

        const newAlertData: Omit<Alert, 'id'> = {
            ...data,
            companyId: company.id,
            number: newAlertNumber,
            author: user.name,
            date: new Date().toISOString(),
            readBy: [],
        };

        const docRef = await addDoc(alertsCollection, newAlertData);
        const newAlert = { ...newAlertData, id: docRef.id } as Alert;
        
        setAlerts(prev => [newAlert, ...prev]);
        setEditingAlert(newAlert); // Keep it in edit mode
        
        toast({
            title: 'Progress Saved',
            description: `Your draft alert "${data.title}" has been saved. You can continue editing.`,
        });
    } catch (error) {
        console.error("Error saving alert progress:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to save the alert draft.'
        });
    }
  }


  const redTagAlerts = alerts.filter(alert => alert.type === 'Red Tag');
  const yellowTagAlerts = alerts.filter(alert => alert.type === 'Yellow Tag');
  
  const AlertTable = ({ alerts }: { alerts: Alert[] }) => (
    <ScrollArea>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map(alert => {
              const targetUserName = alert.targetUserId ? userMap.get(alert.targetUserId) : null;
              const departmentDisplay = targetUserName
                  ? `User: ${targetUserName}`
                  : (alert.department && alert.department !== 'all' ? alert.department : 'All');
              return (
                <TableRow key={alert.id}>
                  <TableCell>{alert.number}</TableCell>
                  <TableCell className="font-medium">{alert.title}</TableCell>
                  <TableCell>{departmentDisplay}</TableCell>
                  <TableCell>{alert.author}</TableCell>
                  <TableCell>{format(parseISO(alert.date), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/alerts/${alert.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                    </Button>
                    {canCreateAlerts && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-2">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleOpenEditDialog(alert)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
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
                                  This action cannot be undone. This will permanently delete the alert "{alert.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => {}}>
                                  Yes, delete alert
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );

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
          <div>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
              Important notifications and operational alerts are displayed here.
              </CardDescription>
          </div>
          {canCreateAlerts && (
              <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingAlert(null); }}>
                  <DialogTrigger asChild>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Notification
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>{editingAlert ? 'Edit System Notification' : 'Create New System Notification'}</DialogTitle>
                          <DialogDescription>
                              {editingAlert ? 'Update the details for this alert.' : 'Select the type and provide details for the new alert.'}
                          </DialogDescription>
                      </DialogHeader>
                      <NewAlertForm 
                        onSubmit={handleAlertSubmit} 
                        onSaveProgress={handleSaveProgress}
                        existingAlert={editingAlert}
                      />
                  </DialogContent>
              </Dialog>
          )}
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="red-tags">
                <TabsList>
                    <TabsTrigger value="red-tags">Red Tags ({redTagAlerts.length})</TabsTrigger>
                    <TabsTrigger value="yellow-tags">Yellow Tags ({yellowTagAlerts.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="red-tags" className="pt-4">
                    {redTagAlerts.length > 0 ? (
                        <AlertTable alerts={redTagAlerts} />
                    ) : (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No active Red Tag alerts.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="yellow-tags" className="pt-4">
                    {yellowTagAlerts.length > 0 ? (
                        <AlertTable alerts={yellowTagAlerts} />
                    ) : (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No active Yellow Tag alerts.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
