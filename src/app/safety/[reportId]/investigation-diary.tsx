

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { SafetyReport } from '@/lib/types';
import { User as UserIcon } from 'lucide-react';

interface InvestigationDiaryProps {
  report: SafetyReport;
}

export function InvestigationDiary({ report }: InvestigationDiaryProps) {
  const diaryEntries = report.investigationDiary || [];

  return (
      <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-4 border rounded-lg p-4">
        {diaryEntries.length > 0 ? (
          diaryEntries.slice().reverse().map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <div className="h-9 w-9 flex-shrink-0 bg-muted rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{entry.author}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{entry.entryText}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No diary entries yet.</p>
        )}
      </div>
  );
}
