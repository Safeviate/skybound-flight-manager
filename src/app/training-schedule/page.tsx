'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function TrainingSchedulePage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Training Schedule</CardTitle>
          <CardDescription>
            This page will display the training schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Content will be added here */}
        </CardContent>
      </Card>
    </main>
  );
}

TrainingSchedulePage.title = 'Training Schedule';
export default TrainingSchedulePage;
