
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { companyData } from '@/lib/data-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Globe, Paintbrush, Rocket } from 'lucide-react';

export default function CompaniesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.permissions.includes('Super User'))) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.permissions.includes('Super User')) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Companies" />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading or insufficient permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Company Management" />
      <main className="flex-1 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Registered Companies</CardTitle>
            <CardDescription>
              A list of all organizations registered in the system.
            </CardDescription>
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
                {companyData.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-primary" />
                        {company.name}
                    </TableCell>
                    <TableCell>{company.trademark}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4 text-muted-foreground" />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: company.theme?.primary || 'transparent' }}></div>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: company.theme?.background || 'transparent' }}></div>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: company.theme?.accent || 'transparent' }}></div>
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
    </div>
  );
}
