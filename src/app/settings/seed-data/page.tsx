
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { userData as seedUsers, aircraftData as seedAircraft } from '@/lib/data-provider'; // Importing the user and aircraft data
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function SeedDataPage() {
  const { company } = useUser();
  const { toast } = useToast();
  const [isSeedingUsers, setIsSeedingUsers] = useState(false);
  const [isSeedingAircraft, setIsSeedingAircraft] = useState(false);

  const handleSeedUsers = async () => {
    if (!company) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No company selected. Cannot seed data.',
      });
      return;
    }

    setIsSeedingUsers(true);
    try {
      const batch = writeBatch(db);
      const usersToSeed = seedUsers.filter(u => u.companyId === 'skybound-aero'); // Filter for the sample data

      usersToSeed.forEach(user => {
        // In a real scenario, you'd handle password creation/auth properly.
        // Here, we just add the user data to Firestore.
        const { password, ...userData } = user; // Exclude password from DB
        const userRef = doc(db, `companies/${company.id}/users`, user.id);
        batch.set(userRef, { ...userData, companyId: company.id }); // Ensure correct companyId
      });

      await batch.commit();

      toast({
        title: 'Database Seeded',
        description: `${usersToSeed.length} users have been added to your company's database.`,
      });
    } catch (error) {
      console.error('Error seeding database:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: 'An error occurred while trying to seed the database.',
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

    setIsSeedingAircraft(true);
    try {
      const batch = writeBatch(db);
      const aircraftToSeed = seedAircraft.filter(ac => ac.companyId === 'skybound-aero');

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
          <CardTitle>Seed Sample Data</CardTitle>
          <CardDescription>
            Populate your database with sample data to explore the application's features.
            This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">User Data</h3>
            <p className="text-sm text-muted-foreground">
              This will add 20 sample users with various roles like instructors, maintenance staff, and students to your current company.
            </p>
            <Button onClick={handleSeedUsers} disabled={isSeedingUsers || isSeedingAircraft}>
              {isSeedingUsers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed Sample Users
            </Button>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Aircraft Data</h3>
            <p className="text-sm text-muted-foreground">
              This will add 5 sample aircraft of various types to your fleet.
            </p>
            <Button onClick={handleSeedAircraft} disabled={isSeedingUsers || isSeedingAircraft}>
              {isSeedingAircraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed Sample Aircraft
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

SeedDataPage.title = 'Seed Sample Data';
export default SeedDataPage;
