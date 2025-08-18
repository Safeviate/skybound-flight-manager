
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const mocId = params.mocId as string;
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (!mocId || !company) {
      setLoading(false);
      return;
    }

    const fetchMoc = async () => {
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
    };

    fetchMoc();
  }, [mocId, user, userLoading, company, router, toast]);

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
  
  const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
  );

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-start">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to MOC List
            </Button>
        </div>
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
    </main>
  );
}
