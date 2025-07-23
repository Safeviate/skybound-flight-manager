
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
import { doc, getDoc } from 'firebase/firestore';


export default function StartChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading } = useUser();
  const aircraftId = params.aircraftId as string;
  const { toast } = useToast();

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [checklist, setChecklist] = useState<Checklist | undefined>(undefined);
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
                if (aircraftSnap.exists()) {
                    setAircraft(aircraftSnap.data() as Aircraft);
                }

                // Assuming pre-flight checklists are linked via a field or have a specific ID format
                // This logic might need adjustment based on the actual DB schema
                const checklistRef = doc(db, `companies/${company.id}/checklist-templates`, `cl-${aircraftId}-pre`);
                const checklistSnap = await getDoc(checklistRef);

                if (checklistSnap.exists()) {
                    const checklistTemplate = checklistSnap.data() as Checklist;
                    setChecklist({
                        ...checklistTemplate,
                        id: `session-${Date.now()}`,
                        items: checklistTemplate.items.map(item => ({ ...item, id: `item-inst-${item.id}`, completed: false })),
                    });
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
      }) : undefined);
    }
  };
  
  const handleUpdate = (updatedChecklist: Checklist) => {
    // In a real app, this would submit the completed checklist state to the database
    setChecklist(updatedChecklist);
    toast({
        title: "Checklist Submitted",
        description: `"${updatedChecklist.title}" has been completed.`
    });
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
            <h1 className="text-2xl font-bold">Checklist Not Found</h1>
            <p className="text-muted-foreground">The pre-flight checklist for this aircraft could not be located in your company's templates.</p>
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
