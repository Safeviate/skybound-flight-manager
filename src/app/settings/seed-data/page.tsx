
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { userData as seedUsers, aircraftData as seedAircraft } from '@/lib/data-provider';
import { Database, Loader2 } from 'lucide-react';

export default function SeedDataPage() {
  const { company } = useUser();
  const { toast } = useToast();
  const [isSeedingUsers, setIsSeedingUsers] = useState(false);
  const [isSeedingAircraft, setIsSeedingAircraft] = useState(false);

  const handleSeedUsers = async () => {
    if (!company) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No company selected. Cannot seed user data.',
      });
      return;
    }

    if (seedUsers.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Seed Data',
            description: 'There is no sample user data available to seed.',
        });
        return;
    }

    setIsSeedingUsers(true);
    try {
      const batch = writeBatch(db);
      // The filter for 'skybound-aero' is removed here to make the seeding company-agnostic.
      const usersToSeed = seedUsers;

      usersToSeed.forEach(user => {
        // Use the predefined ID from the seed data if available, otherwise let Firestore generate one
        const userRef = user.id ? doc(db, `companies/${company.id}/users`, user.id) : doc(collection(db, `companies/${company.id}/users`));
        const { password, ...userData } = user;
        // The companyId is correctly overridden with the current company's ID.
        batch.set(userRef, { ...userData, id: userRef.id, companyId: company.id });
      });

      await batch.commit();

      toast({
        title: 'Users Seeded',
        description: `${usersToSeed.length} sample users have been added to your database.`,
      });
    } catch (error) {
      console.error('Error seeding users:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: 'An error occurred while trying to seed user data.',
      });
    } finally {
      setIsSeedingUsers(false);
    }
  };
  
  const handleSeedAircraft = async () => {
    if (!company) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No company selected. Cannot seed aircraft data.',
      });
      return;
    }

    const aircraftCollectionRef = collection(db, `companies/${company.id}/aircraft`);
    
    // Use getDocs to check for existing aircraft to avoid duplicates if seed is run multiple times
    const existingSnapshot = await getDocs(aircraftCollectionRef);
    const existingIds = new Set(existingSnapshot.docs.map(d => d.id));

    const aircraftToSeed = seedAircraft.filter(ac => ac.companyId === 'skybound-aero' && !existingIds.has(ac.id));

    if (aircraftToSeed.length === 0) {
        toast({
            variant: 'default',
            title: 'No New Aircraft to Seed',
            description: 'Sample aircraft already exist in your fleet.',
        });
        return;
    }

    setIsSeedingAircraft(true);
    try {
      const batch = writeBatch(db);

      aircraftToSeed.forEach(aircraft => {
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        batch.set(aircraftRef, { ...aircraft, companyId: company.id });
      });

      await batch.commit();

      toast({
        title: 'Aircraft Seeded',
        description: `${aircraftToSeed.length} sample aircraft have been added to your fleet.`,
      });
    } catch (error) {
      console.error('Error seeding aircraft:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: 'An error occurred while trying to seed aircraft data.',
      });
    } finally {
      setIsSeedingAircraft(false);
    }
  };

  return (
      <main className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Database Seeding</CardTitle>
            <CardDescription>
              Use these actions to populate your database with sample data for demonstration purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">Seed Sample Users</h3>
                <p className="text-sm text-muted-foreground">
                  Adds approximately 20 sample users including students, instructors, and managers.
                </p>
              </div>
              <Button onClick={handleSeedUsers} disabled={isSeedingUsers} className="mt-2 sm:mt-0">
                {isSeedingUsers ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed Sample Users
              </Button>
            </div>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">Seed Sample Aircraft</h3>
                <p className="text-sm text-muted-foreground">
                  Adds a sample fleet of 5 aircraft with varying statuses and hours.
                </p>
              </div>
              <Button onClick={handleSeedAircraft} disabled={isSeedingAircraft} className="mt-2 sm:mt-0">
                {isSeedingAircraft ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed Sample Aircraft
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
  );
}

SeedDataPage.title = 'Seed Data';
