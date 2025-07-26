
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AuditChecklistsPage() {
    return (
        <main className="flex-1 p-4 md:p-8">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Audit Checklist Templates</CardTitle>
                        <CardDescription>
                            Manage the master checklists used for quality audits.
                        </CardDescription>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Checklist templates will be displayed here.</p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

AuditChecklistsPage.title = "Audit Checklists";
