
'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { checklistData as initialChecklistData } from '@/lib/data-provider';
import type { Checklist } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

export default function ChecklistsPage() {
  const [allChecklists, setAllChecklists] = useState<Checklist[]>(initialChecklistData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, company, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const companyChecklists = useMemo(() => {
    if (!company) return [];
    return allChecklists.filter(c => c.companyId === company.id);
  }, [allChecklists, company]);

  const handleItemToggle = (toggledChecklist: Checklist) => {
    setAllChecklists(prevChecklists =>
      prevChecklists.map(c => (c.id === toggledChecklist.id ? toggledChecklist : c))
    );
  };

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    handleItemToggle(updatedChecklist); // Persist final state
    toast({
        title: "Checklist Submitted",
        description: `"${updatedChecklist.title}" has been completed.`
    });
  };
  
  const handleReset = (checklistId: string) => {
    setAllChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          const originalTemplate = initialChecklistData.find(template => template.id === c.id);
          if (originalTemplate) {
            return {
                ...originalTemplate,
                items: originalTemplate.items.map(item => ({ ...item, completed: false })),
            };
          }
        }
        return c;
      })
    );
  };

  const handleNewChecklist = (newChecklistData: Omit<Checklist, 'id' | 'companyId' | 'items'> & { items: { text: string, completed: boolean }[] }) => {
    if (!company) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot create checklist without a company context.'
        });
        return;
    }

    const checklistWithId: Checklist = {
      ...newChecklistData,
      id: `cl-${Date.now()}`,
      companyId: company.id,
      items: newChecklistData.items.map((item, index) => ({ ...item, id: `item-${Date.now()}-${index}` })),
    };
    setAllChecklists(prev => [...prev, checklistWithId]);
    setIsDialogOpen(false);
  };

  const handleChecklistEdit = (editedChecklist: Checklist) => {
    setAllChecklists(prevChecklists => 
        prevChecklists.map(c => c.id === editedChecklist.id ? editedChecklist : c)
    );
  };

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Checklist Templates" />
            <div className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  const preFlightChecklists = companyChecklists.filter(c => c.category === 'Pre-Flight');
  const postFlightChecklists = companyChecklists.filter(c => c.category === 'Post-Flight');
  const maintenanceChecklists = companyChecklists.filter(c => c.category === 'Post-Maintenance');

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
                Define the title, category, and items for the new checklist template. It will be associated with your company, {company?.name}.
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
                    These are the master checklists used throughout the application for your company. Edit them here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pre-flight">
                <TabsList className="mb-4">
                    <TabsTrigger value="pre-flight">Pre-Flight ({preFlightChecklists.length})</TabsTrigger>
                    <TabsTrigger value="post-flight">Post-Flight ({postFlightChecklists.length})</TabsTrigger>
                    <TabsTrigger value="post-maintenance">Post-Maintenance ({maintenanceChecklists.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pre-flight">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {preFlightChecklists.map(checklist => (
                        <ChecklistCard 
                            key={checklist.id} 
                            checklist={checklist} 
                            onItemToggle={handleItemToggle}
                            onUpdate={handleChecklistUpdate}
                            onReset={handleReset}
                            onEdit={handleChecklistEdit}
                        />
                    ))}
                    </div>
                    {preFlightChecklists.length === 0 && (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No pre-flight checklists found.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="post-flight">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {postFlightChecklists.map(checklist => (
                            <ChecklistCard 
                                key={checklist.id} 
                                checklist={checklist} 
                                onItemToggle={handleItemToggle}
                                onUpdate={handleChecklistUpdate}
                                onReset={handleReset}
                                onEdit={handleChecklistEdit}
                            />
                        ))}
                    </div>
                     {postFlightChecklists.length === 0 && (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No post-flight checklists found.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="post-maintenance">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {maintenanceChecklists.map(checklist => (
                            <ChecklistCard 
                                key={checklist.id} 
                                checklist={checklist} 
                                onItemToggle={handleItemToggle}
                                onUpdate={handleChecklistUpdate}
                                onReset={handleReset}
                                onEdit={handleChecklistEdit}
                            />
                        ))}
                    </div>
                    {maintenanceChecklists.length === 0 && (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No post-maintenance checklists found.</p>
                        </div>
                    )}
                </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
