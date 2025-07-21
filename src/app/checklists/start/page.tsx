
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, zodResolver } from '@mantine/form';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QrCode, ArrowRight } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  checklistId: z.string().min(1, { message: 'Checklist ID cannot be empty.' }),
});

export default function StartChecklistByIdPage() {
  const router = useRouter();
  const [checklistId, setChecklistId] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validation = schema.safeParse({ checklistId });
    if (validation.success) {
      const id = checklistId.replace('skybound-checklist:', '').trim();
      router.push(`/checklists/start/${id}`);
    } else {
        // Simple alert for now, could use toast
        alert(validation.error.errors[0].message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Start Checklist" />
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Start Checklist from ID</CardTitle>
            <CardDescription>
              Scan a QR code to copy the ID, then paste it below to begin the pre-flight checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checklist-id">Checklist ID</Label>
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <Input
                    id="checklist-id"
                    placeholder="Paste checklist ID here..."
                    value={checklistId}
                    onChange={(e) => setChecklistId(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Start Checklist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
