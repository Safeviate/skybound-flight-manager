
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChecklistCard } from '@/app/checklists/checklist-card';
import type { Checklist, Aircraft } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useUser } from '@/context/user-provider';
import Header from '@/components/layout/header';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';


export default function StartChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading } = useUser();
  const aircraftId = params.aircraftId as string;
  const { toast } = useToast();

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
        const currentPath = `/checklists/start/${aircraftId}`;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    } else if (company) {
        const fetchChecklistData = async () => {
            setIsDataLoading(true);
            try {
                const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraftId);
                const aircraftSnap = await getDoc(aircraftRef);
                
                if (!aircraftSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Aircraft not found.'});
                    setIsDataLoading(false);
                    return;
                }

                const fetchedAircraft = aircraftSnap.data() as Aircraft;
                setAircraft(fetchedAircraft);

                // Fetch the assigned pre-flight checklist for this aircraft
                const checklistQuery = query(
                    collection(db, `companies/${company.id}/checklists`), 
                    where('aircraftId', '==', aircraftId),
                    where('category', '==', 'Pre-Flight')
                );
                
                const checklistSnapshot = await getDocs(checklistQuery);

                if (!checklistSnapshot.empty) {
                    const assignedChecklist = checklistSnapshot.docs[0].data() as Checklist;
                     setChecklist({
                        ...assignedChecklist,
                        id: checklistSnapshot.docs[0].id, // Use the actual document ID
                        items: assignedChecklist.items.map(item => ({ ...item, completed: false })), // Reset items for new session
                    });
                } else {
                     setChecklist(null);
                }

            } catch (error) {
                console.error("Error fetching checklist data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load checklist data.'});
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchChecklistData();
    }
  }, [user, company, loading, router, aircraftId, toast]);


  const handleItemToggle = (toggledChecklist: Checklist) => {
    setChecklist(toggledChecklist);
  };
  
  const handleReset = () => {
    if (checklist) {
      setChecklist(prev => prev ? ({
        ...prev,
        items: prev.items.map(item => ({ ...item, completed: false })),
      }) : null);
    }
  };
  
 const handleUpdate = async (updatedChecklist: Checklist) => {
    if (!company || !user || !checklist) return;

    // Reset the checklist items in Firestore for the next user
    const checklistRef = doc(db, `companies/${company.id}/checklists`, checklist.id);
    const resetItems = checklist.items.map(item => ({ ...item, completed: false }));
    await updateDoc(checklistRef, { items: resetItems });

    toast({
        title: "Checklist Submitted",
        description: `"${updatedChecklist.title}" has been completed successfully.`
    });
    
    // Optional: Log completion if needed for auditing
    // await addDoc(collection(db, `companies/${company.id}/completedChecklists`), { ... });
    
    router.push('/aircraft');
  };

  if (loading || isDataLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading checklist...</p>
        </div>
    );
  }

  if (!aircraft || !checklist) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Checklist Not Found" />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <Rocket className="w-16 h-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold">Pre-Flight Checklist Not Found</h1>
            <p className="text-muted-foreground">
                A "Pre-Flight" checklist has not been assigned to this aircraft ({aircraft?.tailNumber || aircraftId}).
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <Header title={`Pre-Flight: ${aircraft.model} (${aircraft.tailNumber})`} />
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <ChecklistCard 
            checklist={checklist} 
            aircraft={aircraft}
            onItemToggle={handleItemToggle}
            onUpdate={handleUpdate}
            onReset={handleReset}
            onEdit={() => {}} // Editing disabled on this page
        />
      </main>
      <Toaster />
    </div>
  );
}
