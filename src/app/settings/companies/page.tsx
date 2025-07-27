
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Globe, Paintbrush, Rocket, PlusCircle, Edit, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import type { Company, User } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import config from '@/config';
import { EditCompanyForm } from './edit-company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function CompaniesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { toast } = useToast();

  async function fetchCompanies() {
      if (config.useMockData) {
          // This path is for mock data, which we are not using.
          // setCompanies(initialCompanyData); 
          return;
      }
      try {
        const companiesCol = collection(db, 'companies');
        const companySnapshot = await getDocs(companiesCol);
        const companyList = companySnapshot.docs.map(doc => doc.data() as Company);
        setCompanies(companyList);
      } catch (e) {
        console.error("Error fetching companies: ", e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch company data from the database.',
        });
      }
  }

  useEffect(() => {
    if (!loading && (!user || !user.permissions.includes('Super User'))) {
      router.push('/');
    } else if (user) {
        fetchCompanies();
    }
  }, [user, loading, router]);


  const handleNewCompany = async (newCompanyData: Omit<Company, 'id'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string) => {
    const companyId = newCompanyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
        const newUserId = userCredential.user.uid;

        const companyDocRef = doc(db, 'companies', companyId);
        const finalCompanyData = { ...newCompanyData, id: companyId };
        await setDoc(companyDocRef, finalCompanyData);
        
        const userDocRef = doc(db, `companies/${companyId}/users`, newUserId);
        const finalUserData: Omit<User, 'password'> = {
            ...adminData,
            id: newUserId,
            companyId: companyId,
            role: 'Admin',
            permissions: ROLE_PERMISSIONS['Admin'],
        };
        await setDoc(userDocRef, finalUserData);

        toast({
            title: "Company Registered Successfully!",
            description: `The company "${newCompanyData.name}" has been created.`
        });
        
        setCompanies(prev => [...prev, finalCompanyData]);
        setIsNewDialogOpen(false);

    } catch (error: any) {
        console.error("Error creating company:", error);
        const errorCode = error.code;
        let errorMessage = "An unknown error occurred.";
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (errorCode === 'auth/weak-password') {
            errorMessage = "The password is too weak. Please use at least 8 characters.";
        }
        toast({
            variant: 'destructive',
            title: "Registration Failed",
            description: errorMessage,
        });
    }
  };

  const handleEditCompany = async (updatedData: Partial<Company>, logoFile?: File) => {
    if (!editingCompany) return;

    let logoUrl = editingCompany.logoUrl;
    if (logoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(logoFile);
        await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                logoUrl = reader.result as string;
                resolve();
            };
            reader.onerror = (error) => reject(error);
        });
    }

    const finalData = { ...updatedData, logoUrl };

    try {
        const companyDocRef = doc(db, 'companies', editingCompany.id);
        await updateDoc(companyDocRef, finalData);
        
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...finalData } : c));
        
        toast({
            title: 'Company Updated',
            description: `${editingCompany.name} has been updated.`,
        });

        setIsEditDialogOpen(false);
        setEditingCompany(null);

    } catch (error) {
        console.error("Error updating company:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save company updates.'});
    }
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setIsEditDialogOpen(true);
  }


  if (loading || !user || !user.permissions.includes('Super User')) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p>Loading or insufficient permissions...</p>
      </main>
    );
  }

  return (
      <main className="flex-1 p-4 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Registered Companies</CardTitle>
                <CardDescription>
                A list of all organizations registered in the system.
                </CardDescription>
            </div>
             <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Company
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Register New Company</DialogTitle>
                        <DialogDescription>
                            Set up a new portal for an organization.
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
                  <TableHead>Company Name</TableHead>
                  <TableHead>Trademark</TableHead>
                  <TableHead>Theme Colors</TableHead>
                  <TableHead>Enabled Features</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-6 w-6 object-contain"/> : <Rocket className="h-5 w-5 text-primary" />}
                        {company.name}
                    </TableCell>
                    <TableCell>{company.trademark}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4 text-muted-foreground" />
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: company.theme?.primary || 'transparent' }}></div>
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: company.theme?.background || 'transparent' }}></div>
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: company.theme?.accent || 'transparent' }}></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.enabledFeatures?.map(feature => (
                        <Badge key={feature} variant="secondary">{feature}</Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" onClick={() => openEditDialog(company)}>
                            <Edit className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editingCompany && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Company: {editingCompany.name}</DialogTitle>
                        <DialogDescription>
                           Update the details for this organization.
                        </DialogDescription>
                    </DialogHeader>
                    <EditCompanyForm company={editingCompany} onSubmit={handleEditCompany} />
                </DialogContent>
            </Dialog>
        )}
      </main>
  );
}

CompaniesPage.title = 'Company Management';
export default CompaniesPage;
