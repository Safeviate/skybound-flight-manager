
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DiscussionEntry, QualityAudit } from '@/lib/types';
import { Reply as ReplyIcon, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';


interface DiscussionSectionProps {
  audit: QualityAudit;
  onUpdate: (updatedReport: QualityAudit) => void;
}

export function DiscussionSection({ audit, onUpdate }: DiscussionSectionProps) {
  const { user } = useUser();
  const discussionEntries = audit.discussion || [];

  return (
    <div className="space-y-6">
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-4">
            {discussionEntries.length > 0 ? (
                discussionEntries.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                        <div className="h-9 w-9 flex-shrink-0 bg-muted rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{entry.author} <ReplyIcon className="inline h-3 w-3 text-muted-foreground mx-1" /> {entry.recipient}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(entry.datePosted), "MMM d, yyyy 'at' h:mm a")}</p>
                            </div>
                            <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{entry.message}</div>
                            <div className="flex items-center justify-between">
                                {entry.replyByDate && (
                                    <div className="text-xs text-muted-foreground">
                                        <Badge variant="warning">Reply needed by {format(new Date(entry.replyByDate), 'MMM d, yyyy')}</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No discussion entries yet.</p>
            )}
        </div>
    </div>
  );
}
