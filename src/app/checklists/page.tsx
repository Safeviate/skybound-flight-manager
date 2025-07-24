
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Checklist, Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';


function ChecklistsPage() {
  const [allChecklists, setAllChecklists] = useState<Checklist[]>([]);
  const [allAircraft, setAllAircraft] = useState<Aircraft[]>([]);
  const { user, company, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (company) {
        const fetchData = async () => {
            const checklistsQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
            const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
            
            const [checklistsSnapshot, aircraftSnapshot] = await Promise.all([
                getDocs(checklistsQuery),
                getDocs(aircraftQuery)
            ]);

            const checklists = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
            const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));

            setAllChecklists(checklists);
            setAllAircraft(aircraft);
        };
        fetchData();
    }
  }, [user, company, loading, router]);


  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  const checklistsByAircraft = allAircraft.map(aircraft => ({
      aircraft,
      checklists: allChecklists.filter(c => c.aircraftId === aircraft.id)
  }));

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
          <CardHeader>
            <div>
              <CardTitle>Checklist Template Overview</CardTitle>
              <CardDescription>
                  This is a read-only overview of all checklist templates, grouped by aircraft. To add or edit templates, please go to the Aircraft page.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
              {checklistsByAircraft.map(({ aircraft, checklists }) => (
                <div key={aircraft.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg">{aircraft.model} ({aircraft.tailNumber})</h3>
                    {checklists.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {checklists.map(checklist => (
                                <Card key={checklist.id}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{checklist.title}</CardTitle>
                                        <CardDescription>{checklist.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {checklist.items.slice(0, 5).map(item => (
                                                <li key={item.id} className="truncate">{item.text}</li>
                                            ))}
                                            {checklist.items.length > 5 && (
                                                <li>...and {checklist.items.length - 5} more.</li>
                                            )}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-2">No specific checklists found for this aircraft.</p>
                    )}
                </div>
              ))}
          </CardContent>
      </Card>
    </main>
  );
}

ChecklistsPage.title = 'Checklist Templates';
export default ChecklistsPage;
