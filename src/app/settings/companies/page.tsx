
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { companyData as initialCompanyData, addCompany, addUser } from '@/lib/data-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Globe, Paintbrush, Rocket, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import type { Company, User } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function CompaniesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanyData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && (!user || !user.permissions.includes('Super User'))) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleNewCompany = (newCompanyData: Omit<Company, 'id'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string) => {
    const newCompanyId = newCompanyData.name.toLowerCase().replace(/\s+/g, '-');
    
    const newCompany: Company = {
        ...newCompanyData,
        id: newCompanyId,
    };

    const newAdminUser: User = {
        ...adminData,
        id: `user-${Date.now()}`,
        companyId: newCompanyId,
        role: 'Admin',
        permissions: ROLE_PERMISSIONS['Admin'],
        password: password,
    };
    
    addCompany(newCompany);
    addUser(newAdminUser);
    setCompanies(prev => [...prev, newCompany]);

    toast({
        title: "Company Registered!",
        description: `The company "${newCompany.name}" has been created.`
    });
    setIsDialogOpen(false);
  };

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
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-primary" />
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
  );
}

CompaniesPage.title = 'Company Management';
export default CompaniesPage;
