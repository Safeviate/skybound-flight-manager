
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { Plane, Wrench, Hourglass, Calendar, CheckSquare } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft, CompletedChecklist } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';
import { AppContent } from '../app-content';


export default function AircraftDetailPage() {
  const params = useParams();
  const aircraftId = params.aircraftId as string;
  const { company } = useUser();
  const { settings } = useSettings();
  
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [checklistHistory, setChecklistHistory] = useState<CompletedChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company || !aircraftId) return;

    const fetchAircraftData = async () => {
        setLoading(true);
        try {
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraftId);
            const aircraftSnap = await getDoc(aircraftRef);

            if (aircraftSnap.exists()) {
                setAircraft(aircraftSnap.data() as Aircraft);
            }

            const checklistQuery = query(
                collection(db, `companies/${company.id}/completedChecklists`), 
                where('aircraftId', '==', aircraftId),
                orderBy('completionDate', 'desc')
            );
            const checklistSnapshot = await getDocs(checklistQuery);
            const history = checklistSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as CompletedChecklist));
            setChecklistHistory(history);
        } catch (error) {
            console.error("Error fetching aircraft details:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchAircraftData();
  }, [company, aircraftId]);

  if (loading) {
      return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <p>Loading aircraft details...</p>
        </main>
      );
  }

  if (!aircraft) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>The requested aircraft could not be found.</p>
      </main>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Available': return 'success';
      case 'In Maintenance': return 'destructive';
      case 'Booked': return 'secondary';
      default: return 'outline';
    }
  };
  
  const documents = [
      { label: 'Airworthiness', date: aircraft.airworthinessExpiry },
      { label: 'Insurance', date: aircraft.insuranceExpiry },
      { label: 'Certificate of Release to Service', date: aircraft.certificateOfReleaseToServiceExpiry },
      { label: 'Certificate of Registration', date: aircraft.certificateOfRegistrationExpiry },
      { label: 'Mass and Balance', date: aircraft.massAndBalanceExpiry },
      { label: 'Radio Station License', date: aircraft.radioStationLicenseExpiry },
  ];

  return (
    <AppContent>
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{aircraft.model}</CardTitle>
                <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
              </div>
              <Badge variant={getStatusVariant(aircraft.status)} className="text-base">{aircraft.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Hourglass className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Total Hours</p>
                <p className="text-muted-foreground">{aircraft.hours.toFixed(1)}</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">Next Service ({aircraft.nextServiceType})</p>
                <p className="text-muted-foreground">{aircraft.hoursUntilService} hrs</p>
              </div>
            </div>
            {documents.map(doc => (
                <div key={doc.label} className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{doc.label}</p>
                        {getExpiryBadge(doc.date, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CheckSquare />
                Checklist History
            </CardTitle>
            <CardDescription>
              A log of all completed pre-flight and post-flight checklists for this aircraft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistHistory.length > 0 ? (
                  checklistHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.checklistName}</TableCell>
                      <TableCell>
                        <Badge variant={item.checklistType === 'Pre-Flight' ? 'default' : 'secondary'}>
                          {item.checklistType}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.completedBy}</TableCell>
                      <TableCell>{format(parseISO(item.completionDate), 'MMM d, yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No completed checklists found for this aircraft.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </AppContent>
  );
}

AircraftDetailPage.title = "Aircraft Details";
