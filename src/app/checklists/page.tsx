
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import type { Checklist } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, addDoc } from 'firebase/firestore';


function ChecklistsPage() {
  const [allChecklists, setAllChecklists] = useState<Checklist[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, company, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (company) {
        const fetchChecklists = async () => {
            const checklistsQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
            const snapshot = await getDocs(checklistsQuery);
            const checklists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
            setAllChecklists(checklists);
        };
        fetchChecklists();
    }
  }, [user, company, loading, router]);


  const handleItemToggle = (toggledChecklist: Checklist) => {
    // This is handled locally by ChecklistCard and submitted on save.
    // To provide a responsive UI, we can update the state optimistically here
    setAllChecklists(prev => prev.map(c => c.id === toggledChecklist.id ? toggledChecklist : c));
  };

  const handleChecklistUpdate = (updatedChecklist: Checklist) => {
    // This is for standalone checklist completion, which doesn't happen on this page.
  };
  
  const handleReset = (checklistId: string) => {
     setAllChecklists(prevChecklists =>
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

  const handleNewChecklist = async (newChecklistData: Omit<Checklist, 'id' | 'companyId'>) => {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot create checklist without a company context.' });
        return;
    }

    try {
        const checklistToSave: Omit<Checklist, 'id'> = {
            ...newChecklistData,
            companyId: company.id,
            items: newChecklistData.items.map((item, index) => ({ ...item, id: `item-${Date.now()}-${index}` })),
        };
        
        const docRef = await addDoc(collection(db, `companies/${company.id}/checklist-templates`), checklistToSave);

        setAllChecklists(prev => [...prev, { ...checklistToSave, id: docRef.id }]);
        setIsDialogOpen(false);
        toast({ title: 'Checklist Template Created', description: `"${newChecklistData.title}" has been saved.`});
    } catch(error) {
        console.error("Error creating new checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create checklist template.'});
    }
  };

  const handleChecklistEdit = async (editedChecklist: Checklist) => {
    if (!company) return;
    try {
        const checklistRef = doc(db, `companies/${company.id}/checklist-templates`, editedChecklist.id);
        await setDoc(checklistRef, editedChecklist, { merge: true });
        setAllChecklists(prevChecklists => 
            prevChecklists.map(c => c.id === editedChecklist.id ? editedChecklist : c)
        );
        toast({ title: 'Checklist Updated', description: 'Changes have been saved.' });
    } catch(error) {
        console.error("Error updating checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update checklist.' });
    }
  };

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  const preFlightChecklists = allChecklists.filter(c => c.category === 'Pre-Flight');
  const postFlightChecklists = allChecklists.filter(c => c.category === 'Post-Flight');
  const maintenanceChecklists = allChecklists.filter(c => c.category === 'Post-Maintenance');

  const headerContent = (
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
  );

  return (
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
  );
}

ChecklistsPage.title = 'Checklist Templates';
export default ChecklistsPage;
