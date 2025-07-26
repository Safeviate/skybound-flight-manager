
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function AuditChecklistsManager() {

  return (
    <Card>
        <CardHeader>
            <CardTitle>Audit Checklist Templates</CardTitle>
            <CardDescription>
                Manage the master checklists used for conducting quality audits.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Checklist Template
                </Button>
            </div>
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No checklist templates found.</p>
            </div>
        </CardContent>
    </Card>
  );
}
