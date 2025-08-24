
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Repeat, Building } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import type { Company, Feature } from '@/lib/types';
import { EditCompanyForm } from './edit-company-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export function CompaniesPageContent({ initialCompanies }: { initialCompanies: Company[] }) {
  const { user, company: currentCompany, setCompany, userCompanies } = useUser();
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>(initialCompanies);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const router = useRouter();

  const handleUpdateCompany = async (updatedData: Partial<Company>, logoFile?: File) => {
    if (!editingCompany) return;

    try {
      let logoUrl = editingCompany.logoUrl;
      if (logoFile) {
        // This is a simplified Base64 conversion. A real app should upload to a service like Firebase Storage.
        logoUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(logoFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const companyRef = doc(db, 'companies', editingCompany.id);
      await updateDoc(companyRef, { ...updatedData, logoUrl });

      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...updatedData, logoUrl } : c));
      setIsDialogOpen(false);
      setEditingCompany(null);
      toast({ title: 'Company Updated', description: 'The company details have been saved.' });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update company.' });
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
    setIsDialogOpen(true);
  };

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Companies</CardTitle>
          <CardDescription>
            View and manage all companies registered in the system.
          </CardDescription>
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
