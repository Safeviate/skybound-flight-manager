
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChecklistCard } from '@/app/checklists/checklist-card';
import type { Checklist, Aircraft } from '@/lib/types';
import { checklistData, aircraftData } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function StartChecklistPage() {
  const params = useParams();
  const aircraftId = params.aircraftId as string;
  const { toast } = useToast();

  const aircraft = aircraftData.find(a => a.id === aircraftId);
  // Find the master checklist template
  const checklistTemplate = checklistData.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraftId);
  
  // Create a unique instance of the checklist for this session
  const [checklist, setChecklist] = useState<Checklist | undefined>(() => {
    if (!checklistTemplate) return undefined;
    return {
      ...checklistTemplate,
      id: `session-${Date.now()}`, // Give this specific checklist run a unique ID
      items: checklistTemplate.items.map(item => ({ ...item, completed: false })),
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
        items: checklistTemplate.items.map(item => ({ ...item, completed: false })),
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

  if (!aircraft || !checklist) {
    return (
      <div className="flex flex-col min-h-screen">
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
        <header className="bg-background p-4 border-b">
            <CardTitle>Pre-Flight: {aircraft.model} ({aircraft.tailNumber})</CardTitle>
        </header>
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
