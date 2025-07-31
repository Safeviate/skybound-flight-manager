
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Database, Edit } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import type { AuditChecklist } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChecklistTemplateForm } from './checklist-template-form';
import { createMasterChecklists } from './actions';

export function AuditChecklistsManager() {
  const [templates, setTemplates] = useState<AuditChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditChecklist | null>(null);
  const { user, company } = useUser();
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!company) return;
    setLoading(true);
    const templatesQuery = query(collection(db, `companies/${company.id}/audit-checklists`));
    const snapshot = await getDocs(templatesQuery);
    setTemplates(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditChecklist)));
    setLoading(false);
  };

  useEffect(() => {
    if (company) {
      fetchTemplates();
    }
  }, [company]);

  const handleSeed = async () => {
    if (!company) return;
    setIsSeeding(true);
    try {
      await createMasterChecklists(company.id);
      await fetchTemplates();
      toast({ title: "Master Checklists Created", description: "The three standard checklists have been added." });
    } catch (error) {
      console.error("Error seeding checklists:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not create master checklists." });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFormSubmit = async (data: Omit<AuditChecklist, 'id' | 'companyId'>) => {
    if (!company) return;

    try {
      if (editingTemplate) {
        const templateRef = doc(db, `companies/${company.id}/audit-checklists`, editingTemplate.id);
        await setDoc(templateRef, data, { merge: true });
        toast({ title: "Template Updated" });
      } else {
        // This case might not be used if creation is only through master templates
      }
      fetchTemplates();
      setIsFormOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save the checklist template." });
    }
  };

  const handleEdit = (template: AuditChecklist) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  if (loading) {
    return <p>Loading checklists...</p>;
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg text-center p-4">
          <p className="text-muted-foreground mb-4">No checklist templates found. Create the standard master templates to begin.</p>
          <Button onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? 'Creating...' : 'Create Master Checklists'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <ChecklistCard key={template.id} template={template} onEdit={handleEdit} />
          ))}
        </div>
      )}
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingTemplate(null); setIsFormOpen(isOpen); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Checklist Template</DialogTitle>
            <DialogDescription>
              Modify the items and properties of this checklist template.
            </DialogDescription>
          </DialogHeader>
          <ChecklistTemplateForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate || undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
