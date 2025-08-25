
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Repeat, Building, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc, writeBatch, collection, addDoc } from 'firebase/firestore';
import type { Company, Feature, User } from '@/lib/types';
import { EditCompanyForm } from './edit-company-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { NewCompanyForm } from './new-company-form';
import { ROLE_PERMISSIONS } from '@/lib/types';

export function CompaniesPageContent({ initialCompanies }: { initialCompanies: Company[] }) {
  const { user, company: currentCompany, setCompany, userCompanies, setUserCompanies } = useUser();
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>(initialCompanies);
  const [isNewCompanyDialogOpen, setIsNewCompanyDialogOpen] = React.useState(false);
  const [isEditCompanyDialogOpen, setIsEditCompanyDialogOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const router = useRouter();
  
  React.useEffect(() => {
    // If userCompanies from the context is available, use it as the source of truth
    if (userCompanies.length > 0) {
        setCompanies(userCompanies);
    } else {
        setCompanies(initialCompanies);
    }
  }, [initialCompanies, userCompanies]);

  const handleUpdateCompany = async (updatedData: Partial<Company>, logoFile?: File) => {
    if (!editingCompany) return;

    try {
      let logoUrl = editingCompany.logoUrl;
      if (logoFile) {
        logoUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(logoFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const companyRef = doc(db, 'companies', editingCompany.id);
      const dataToSave = { ...updatedData, logoUrl };
      await updateDoc(companyRef, dataToSave);

      const finalUpdatedData = { ...editingCompany, ...dataToSave };

      setUserCompanies(prev => prev.map(c => c.id === editingCompany.id ? finalUpdatedData : c));
      
      if (currentCompany?.id === editingCompany.id) {
          setCompany(finalUpdatedData);
      }

      setIsEditCompanyDialogOpen(false);
      setEditingCompany(null);
      toast({ title: 'Company Updated', description: 'The company details have been saved.' });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update company.' });
    }
  };
  
  const handleNewCompany = async (companyData: Omit<Company, 'id' | 'trademark'>, logoFile?: File) => {
    const companyId = companyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
    let logoUrl = '';
    if (logoFile) {
        logoUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(logoFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    try {
        const companyDocRef = doc(db, 'companies', companyId);
        const finalCompanyData: Company = {
            id: companyId,
            logoUrl: logoUrl,
            trademark: `Your Trusted Partner in Aviation`,
            ...companyData,
        };
        await addDoc(collection(db, 'companies'), finalCompanyData);

        toast({
            title: "New Company Created!",
            description: `The company portal for ${companyData.name} is ready. You should create an admin user for it.`
        });
        
        setUserCompanies(prev => [...prev, finalCompanyData]);
        setIsNewCompanyDialogOpen(false);
    } catch (error: any) {
        console.error("Error creating company:", error);
        toast({
            variant: 'destructive',
            title: "Registration Failed",
            description: "An error occurred while creating the company.",
        });
    }
  };

  const handleSwitchCompany = (companyToSwitch: Company) => {
    setCompany(companyToSwitch);
    toast({
        title: 'Switched Company',
        description: `You are now managing ${companyToSwitch.name}.`,
    });
    router.push('/my-dashboard');
  }

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setIsEditCompanyDialogOpen(true);
  };

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Companies</CardTitle>
              <CardDescription>
                View and manage all companies registered in the system.
              </CardDescription>
            </div>
            <Dialog open={isNewCompanyDialogOpen} onOpenChange={setIsNewCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Create New Company</DialogTitle>
                    <DialogDescription>
                        Set up a new company portal. You can add users after creation.
                    </DialogDescription>
                </DialogHeader>
                <NewCompanyForm onSubmit={handleNewCompany} />
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(company => (
                <TableRow key={company.id} className={currentCompany?.id === company.id ? 'bg-muted/50' : ''}>
                  <TableCell>
                    {company.logoUrl ? (
                      <Image src={company.logoUrl} alt={`${company.name} logo`} width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
                    ) : (
                      <div className="h-8 w-8 flex items-center justify-center bg-muted rounded-md">
                        <Building className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                   <TableCell>
                    {currentCompany?.id === company.id && (
                        <Badge>Active</Badge>
                    )}
                   </TableCell>
                  <TableCell className="text-right">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchCompany(company)}
                        disabled={currentCompany?.id === company.id}
                    >
                        <Repeat className="mr-2 h-4 w-4" /> Switch to Company
                    </Button>
                    <Button variant="ghost" size="icon" className="ml-2" onClick={() => openEditDialog(company)}>
                        <Edit className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingCompany && (
        <Dialog open={isEditCompanyDialogOpen} onOpenChange={setIsEditCompanyDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Company: {editingCompany.name}</DialogTitle>
            </DialogHeader>
            <EditCompanyForm
              company={editingCompany}
              onSubmit={handleUpdateCompany}
            />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
