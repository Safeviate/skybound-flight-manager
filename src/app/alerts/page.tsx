
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, ChevronRight, PlusCircle, Users, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Alert } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { NewAlertForm } from './new-alert-form';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-6 w-6 text-destructive" />;
        case 'Yellow Tag': return <Info className="h-6 w-6 text-yellow-600" />;
        default: return null;
    }
}

function AlertsPage() {
  const { user, company, loading } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchAlerts() {
        if (!company) return;
        try {
            const alertsCollection = collection(db, 'companies', company.id, 'alerts');
            const q = query(alertsCollection, orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetchedAlerts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
            setAlerts(fetchedAlerts);
        } catch (error) {
            console.error("Error fetching alerts: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch alerts from the database.'
            });
        }
    }
    if (company) {
        fetchAlerts();
    }
  }, [company, toast]);
  
  const canCreateAlerts = user?.permissions.includes('Super User') || user?.permissions.includes('Alerts:Edit');

  const handleNewAlert = async (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => {
    if (!user || !company) return;

    // In a real app, number generation should be handled server-side to avoid race conditions.
    // For this client-side example, we'll calculate it based on fetched data.
    const lastAlertOfType = alerts
        .filter(a => a.type === data.type)
        .sort((a,b) => b.number! - a.number!)[0];

    const newAlertData: Alert = {
        ...data,
        companyId: company.id,
        number: (lastAlertOfType?.number || 0) + 1,
        author: user.name,
        date: format(new Date(), 'yyyy-MM-dd'),
        readBy: [user.id],
    };

    try {
        const alertsCollection = collection(db, 'companies', company.id, 'alerts');
        const docRef = await addDoc(alertsCollection, newAlertData);
        setAlerts(prev => [{ ...newAlertData, id: docRef.id }, ...prev]);
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error creating new alert:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to create the alert in the database.'
        });
    }
  }
  
  const handleDeleteAlert = async (alertId: string) => {
    if (!company) return;
    
    try {
      const alertRef = doc(db, 'companies', company.id, 'alerts', alertId);
      await deleteDoc(alertRef);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: 'Alert Deleted',
        description: 'The alert has been successfully deleted.',
      });
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the alert.',
      });
    }
  };


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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Notification
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New System Notification</DialogTitle>
                            <DialogDescription>
                                Select the type and provide details for the new alert.
                            </DialogDescription>
                        </DialogHeader>
                        <NewAlertForm onSubmit={handleNewAlert} />
                    </DialogContent>
                </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <Collapsible key={alert.id} className="w-full">
                            <Card className="hover:bg-muted/50 transition-colors">
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                   <div className="flex items-start gap-4 flex-1">
                                        {getAlertIcon(alert.type)}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getAlertVariant(alert.type)}>{alert.type}</Badge>
                                                <CardTitle className="text-lg">#{alert.number} - {alert.title}</CardTitle>
                                            </div>
                                            <CardDescription className="mt-2">{alert.description}</CardDescription>
                                        </div>
                                   </div>
                                   <div className="flex items-center">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                                      </Button>
                                    </CollapsibleTrigger>
                                     {canCreateAlerts && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
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
                                                        <AlertDialogAction onClick={() => handleDeleteAlert(alert.id)}>
                                                            Yes, delete alert
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                     )}
                                   </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Issued by {alert.author} on {format(parseISO(alert.date), 'MMM d, yyyy')}</p>
                                </CardContent>
                            </Card>
                            <CollapsibleContent>
                                <div className="p-4 border-t-0 border rounded-b-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold">Acknowledged By ({alert.readBy.length})</h4>
                                  </div>
                                  {alert.readBy.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {alert.readBy.map(name => (
                                        <Badge key={name} variant="secondary">{name}</Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No acknowledgements yet.</p>
                                  )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No active alerts.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
  );
}

AlertsPage.title = 'Alerts & Notifications';
export default AlertsPage;
