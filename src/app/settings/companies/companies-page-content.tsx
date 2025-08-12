
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, addDoc, writeBatch } from 'firebase/firestore';
import type { Company, User } from '@/lib/types';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { EditCompanyForm } from './edit-company-form';

export function CompaniesPageContent({ initialCompanies }: { initialCompanies: Company[] }) {
  const { company: currentCompany, user } = useUser();
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>(initialCompanies);
  const [isNewCompanyOpen, setIsNewCompanyOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);

  const fetchCompanies = React.useCallback(async () => {
    try {
      const companiesQuery = query(collection(db, 'companies'));
      const snapshot = await getDocs(companiesQuery);
      setCompanies(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company)));
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load companies.' });
    }
  }, [toast]);

  React.useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);
  
  const handleNewCompanySubmit = async (companyData: Omit<Company, 'id'>, adminData: Omit<User, 'id'|'companyId'|'role'|'permissions'>, password: string, logoFile?: File) => {
    const newCompanyId = companyData.name.toLowerCase().replace(/\s+/g, '-');
    let logoUrl = '';
    // Handle logo upload if needed, for simplicity we skip it here.

    const batch = writeBatch(db);

    const companyRef = doc(db, 'companies', newCompanyId);
    batch.set(companyRef, { ...companyData, id: newCompanyId, logoUrl });

    // In a real app, you would create the user in Firebase Auth.
    // For this demo, we'll just create the Firestore document.
    const newUserId = doc(collection(db, 'temp')).id;
    const userRef = doc(db, `companies/${newCompanyId}/users`, newUserId);
    batch.set(userRef, {
        ...adminData,
        id: newUserId,
        companyId: newCompanyId,
        role: 'Admin',
        permissions: ROLE_PERMISSIONS['Admin'],
        status: 'Active',
    });

    try {
        await batch.commit();
        await sendEmail({
            to: adminData.email,
            subject: `Welcome to ${companyData.name}`,
            emailData: {
                userName: adminData.name,
                companyName: companyData.name,
                userEmail: adminData.email,
                temporaryPassword: password,
                loginUrl: window.location.origin + '/login',
            },
        });
        toast({ title: 'Company Created', description: `Company ${companyData.name} and its admin have been created.` });
        fetchCompanies();
        setIsNewCompanyOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create company.'});
    }
  };

  const handleEditCompanySubmit = async (updatedData: Partial<Company>, logoFile?: File) => {
    if (!editingCompany) return;
    try {
      const companyRef = doc(db, 'companies', editingCompany.id);
      await setDoc(companyRef, updatedData, { merge: true });
      toast({ title: 'Company Updated', description: 'The company details have been saved.'});
      fetchCompanies();
      setEditingCompany(null);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update company.'});
    }
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader className="flex-row justify-between items-start">
          <div>
            <CardTitle>Company Management</CardTitle>
            <CardDescription>
              Oversee all company instances in the system.
            </CardDescription>
          </div>
          <Button onClick={() => setIsNewCompanyOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Company
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Enabled Features</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(company => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {company.enabledFeatures?.join(', ')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingCompany(company)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isNewCompanyOpen} onOpenChange={setIsNewCompanyOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
             <DialogDescription>
                Set up a new company instance and its first administrator account.
            </DialogDescription>
          </DialogHeader>
          <NewCompanyForm onSubmit={handleNewCompanySubmit} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Company: {editingCompany?.name}</DialogTitle>
                <DialogDescription>
                    Update the details and configuration for this company.
                </DialogDescription>
            </DialogHeader>
            {editingCompany && <EditCompanyForm company={editingCompany} onSubmit={handleEditCompanySubmit} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
