
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { checklistData } from '@/lib/mock-data';
import type { Checklist } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(checklistData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => (c.id === updatedChecklist.id ? updatedChecklist : c))
    );
  };
  
  const handleReset = (checklistId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          return {
            ...c,
            items: c.items.map(item => ({ ...item, completed: false })),
          };
        }
        return c;
      })
    );
  };

  const handleNewChecklist = (newChecklist: Omit<Checklist, 'id'>) => {
    const checklistWithId: Checklist = {
      ...newChecklist,
      id: `cl-${Date.now()}`,
      items: newChecklist.items.map((item, index) => ({ ...item, id: `item-${Date.now()}-${index}` })),
    };
    setChecklists(prev => [...prev, checklistWithId]);
    setIsDialogOpen(false);
  };

  const preFlightChecklists = checklists.filter(c => c.category === 'Pre-Flight');
  const postFlightChecklists = checklists.filter(c => c.category === 'Post-Flight');
  const maintenanceChecklists = checklists.filter(c => c.category === 'Maintenance');

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Checklist Templates">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Checklist Template</DialogTitle>
              <DialogDescription>
                Define the title, category, and items for the new checklist template.
              </DialogDescription>
            </DialogHeader>
            <NewChecklistForm onSubmit={handleNewChecklist} />
          </DialogContent>
        </Dialog>
      </Header>
      <main className="flex-1 p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Manage Checklist Templates</CardTitle>
                <CardDescription>
                    These are the master checklists used throughout the application. Edit them here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pre-flight">
                <TabsList className="mb-4">
                    <TabsTrigger value="pre-flight">Pre-Flight</TabsTrigger>
                    <TabsTrigger value="post-flight">Post-Flight</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>
                <TabsContent value="pre-flight">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {preFlightChecklists.map(checklist => (
                        <ChecklistCard 
                        key={checklist.id} 
                        checklist={checklist} 
                        onUpdate={handleChecklistUpdate}
                        onReset={handleReset}
                        />
                    ))}
                    </div>
                </TabsContent>
                <TabsContent value="post-flight">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {postFlightChecklists.map(checklist => (
                            <ChecklistCard 
                            key={checklist.id} 
                            checklist={checklist} 
                            onUpdate={handleChecklistUpdate}
                            onReset={handleReset}
                            />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="maintenance">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {maintenanceChecklists.map(checklist => (
                            <ChecklistCard 
                            key={checklist.id} 
                            checklist={checklist} 
                            onUpdate={handleChecklistUpdate}
                            onReset={handleReset}
                            />
                        ))}
                    </div>
                </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
