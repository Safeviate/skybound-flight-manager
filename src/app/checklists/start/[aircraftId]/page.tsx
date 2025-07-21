
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChecklistCard } from '@/app/checklists/checklist-card';
import type { Checklist, Aircraft } from '@/lib/types';
import { checklistData, aircraftData } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import Header from '@/components/layout/header';

export default function StartChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useUser();
  const aircraftId = params.aircraftId as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
        // If not logged in, redirect to login page with a redirect parameter
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, router]);


  const aircraft = aircraftData.find(a => a.id === aircraftId);
  // Find the master checklist template
  const checklistTemplate = checklistData.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraftId);
  
  // Create a unique instance of the checklist for this session
  const [checklist, setChecklist] = useState<Checklist | undefined>(() => {
    if (!checklistTemplate) return undefined;
    return {
      ...checklistTemplate,
      id: `session-${Date.now()}`, // Give this specific checklist run a unique ID
      items: checklistTemplate.items.map(item => ({ ...item, id: `item-inst-${item.id}`, completed: false })),
    };
  });

  const handleItemToggle = (toggledChecklist: Checklist) => {
    setChecklist(toggledChecklist);
  };
  
  const handleReset = (checklistId: string) => {
    if (checklistTemplate) {
      setChecklist({
        ...checklistTemplate,
        id: `session-${Date.now()}`,
        items: checklistTemplate.items.map(item => ({ ...item, id: `item-inst-${item.id}`, completed: false })),
      });
    }
  };
  
  const handleUpdate = (updatedChecklist: Checklist) => {
    setChecklist(updatedChecklist);
    toast({
        title: "Checklist Submitted",
        description: `"${updatedChecklist.title}" has been completed.`
    });
  };

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting to login...</p>
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
            <p className="text-muted-foreground">The checklist for this aircraft could not be located. Please check the QR code or contact support.</p>
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
