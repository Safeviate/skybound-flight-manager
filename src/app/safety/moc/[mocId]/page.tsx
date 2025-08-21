
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
);


export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const mocId = params.mocId as string;
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const canEdit = useMemo(() => user?.permissions.includes('MOC:Edit') || user?.permissions.includes('Super User'), [user]);

  const fetchMoc = useCallback(async () => {
    if (!mocId || !company) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const mocRef = doc(db, `companies/${company.id}/management-of-change`, mocId);
      const mocSnap = await getDoc(mocRef);

      if (mocSnap.exists()) {
        setMoc({ id: mocSnap.id, ...mocSnap.data() } as ManagementOfChange);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Management of Change record not found.' });
        setMoc(null);
      }
    } catch (error) {
      console.error("Error fetching MOC details:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch MOC details.' });
    } finally {
      setLoading(false);
    }
  }, [mocId, company, toast]);
  
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMoc();
  }, [mocId, user, userLoading, router, fetchMoc]);

  if (loading || userLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>Loading MOC details...</p>
      </main>
    );
  }

  if (!moc) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>The requested Management of Change record could not be found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-start">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to MOC List
            </Button>
        </div>
        <div className="border-4 border-blue-500 p-4 rounded-lg relative">
            <div className="absolute -top-3 left-4 bg-background px-2 text-blue-500 font-semibold text-sm">Step 1: Change Proposal</div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <Badge>{moc.status}</Badge>
                        <CardTitle className="mt-2">{moc.mocNumber}: {moc.title}</CardTitle>
                        <CardDescription>
                            Proposed by {moc.proposedBy} on {format(parseISO(moc.proposalDate), 'MMMM d, yyyy')}
                        </CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Separator />
                 <DetailSection title="Description of Change">
                    <p className="whitespace-pre-wrap">{moc.description}</p>
                 </DetailSection>
                 <DetailSection title="Reason for Change">
                    <p className="whitespace-pre-wrap">{moc.reason}</p>
                 </DetailSection>
                 <DetailSection title="Scope of Change">
                    <p className="whitespace-pre-wrap">{moc.scope}</p>
                 </DetailSection>
              </CardContent>
            </Card>
        </div>

        <div className="border-4 border-orange-500 p-4 rounded-lg relative">
          <div className="absolute -top-3 left-4 bg-background px-2 text-orange-500 font-semibold text-sm">Step 2: Implementation Plan & Hazard Analysis</div>
          <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Implementation Phases</CardTitle>
                        <CardDescription>
                            Outline the steps required to implement the change.
                        </CardDescription>
                    </div>
                    {canEdit && (
                        <Button variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Phase
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
              {/* Content for implementation phases will go here */}
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}

MocDetailPage.title = "Management of Change";
