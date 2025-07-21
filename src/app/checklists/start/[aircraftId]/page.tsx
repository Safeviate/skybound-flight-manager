
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/header';
import { ChecklistCard } from '@/app/checklists/checklist-card';
import type { Checklist, Aircraft } from '@/lib/types';
import { checklistData, aircraftData } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';

export default function StartChecklistPage() {
  const params = useParams();
  const aircraftId = params.aircraftId as string;
  const { toast } = useToast();

  const aircraft = aircraftData.find(a => a.id === aircraftId);
  const initialChecklist = checklistData.find(c => c.category === 'Pre-Flight' && c.aircraftId === aircraftId);
  
  const [checklist, setChecklist] = useState<Checklist | undefined>(initialChecklist);

  const handleItemToggle = (toggledChecklist: Checklist) => {
    setChecklist(toggledChecklist);
  };
  
  const handleReset = (checklistId: string) => {
    if (initialChecklist) {
      setChecklist({
        ...initialChecklist,
        items: initialChecklist.items.map(item => ({ ...item, completed: false })),
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
    <div className="flex flex-col min-h-screen">
      <Header title={`Pre-Flight: ${aircraft.model}`} />
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center bg-muted/40">
        <ChecklistCard 
            checklist={checklist} 
            aircraft={aircraft}
            onItemToggle={handleItemToggle}
            onUpdate={handleUpdate}
            onReset={handleReset}
            onEdit={() => {}} // Editing disabled on this page
        />
      </main>
    </div>
  );
}
