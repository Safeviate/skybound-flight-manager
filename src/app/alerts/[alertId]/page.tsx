
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import type { Alert, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Printer, AlertTriangle, Info, BellRing, Mail } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-6 w-6 text-destructive" />;
        case 'Yellow Tag': return <Info className="h-6 w-6 text-yellow-600" />;
        default: return <BellRing className="h-6 w-6 text-primary" />;
    }
}

const formatTextForDisplay = (text: string) => {
    return text.replace(/\n/g, '<br />');
};

export default function AlertDetailPage() {
  const params = useParams();
  const alertId = params.alertId as string;
  const { company, user } = useUser();
  const { toast } = useToast();
  const [alert, setAlert] = React.useState<Alert | null>(null);
  const [personnel, setPersonnel] = React.useState<User[]>([]);
  const router = useRouter();

  const userMap = React.useMemo(() => {
    const map = new Map<string, string>();
    personnel.forEach(u => {
        map.set(u.id, u.name);
    });
    return map;
  }, [personnel]);
  
  React.useEffect(() => {
    const fetchData = async () => {
        if (!company || !alertId) return;
        try {
            const alertRef = doc(db, `companies/${company.id}/alerts`, alertId);
            const personnelQuery = query(collection(db, `companies/${company.id}/users`));
            const studentsQuery = query(collection(db, `companies/${company.id}/students`));

            const [alertSnap, personnelSnapshot, studentsSnapshot] = await Promise.all([
                getDoc(alertRef),
                getDocs(personnelQuery),
                getDocs(studentsQuery)
            ]);

            if (alertSnap.exists()) {
                setAlert({ ...alertSnap.data(), id: alertSnap.id } as Alert);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Alert not found.' });
            }
            
            const personnelList = personnelSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            const studentList = studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setPersonnel([...personnelList, ...studentList]);

        } catch (error) {
            console.error("Error fetching alert details:", error)
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load alert details.' });
        }
    };
    fetchData();
  }, [company, alertId, toast]);
  
  if (!alert) {
    return <div className="p-8">Loading alert...</div>;
  }
  
  const targetUserName = alert.targetUserId ? userMap.get(alert.targetUserId) : null;
  const reviewerName = alert.reviewerId ? userMap.get(alert.reviewerId) : null;

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center no-print">
            <Button variant="outline" asChild>
                <Link href="/alerts">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Alerts
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Alert
                </Button>
            </div>
        </div>
        <Card className="print:shadow-none print:border-none">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {company?.logoUrl && (
                        <Image
                            src={company.logoUrl}
                            alt={`${company.name} Logo`}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-md object-contain"
                        />
                    )}
                </div>
                <div className="flex-1 text-center">
                    <CardTitle>{company?.name}</CardTitle>
                    <CardDescription>System Alert</CardDescription>
                </div>
                <div className="w-16 flex justify-end">
                    {getAlertIcon(alert.type)}
                </div>
            </div>
            <Separator className="my-4"/>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="mt-2 text-2xl">{alert.number ? `#${alert.number}`: ''} {alert.title}</CardTitle>
                    <CardDescription>
                        Issued by {alert.author} on {format(parseISO(alert.date), 'MMMM d, yyyy')}
                        {targetUserName
                            ? ` to ${targetUserName}`
                            : alert.department && alert.department !== 'all'
                            ? ` to ${alert.department} Department`
                            : ' to All Personnel'
                        }
                    </CardDescription>
                </div>
                <Badge variant={getAlertVariant(alert.type)}>{alert.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {alert.background && (
                <div>
                    <h4 className="font-semibold text-lg mb-1">Background</h4>
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md break-words" dangerouslySetInnerHTML={{ __html: formatTextForDisplay(alert.background) }} />
                </div>
            )}
            {alert.purpose && (
                 <div>
                    <h4 className="font-semibold text-lg mb-1">Purpose</h4>
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md break-words" dangerouslySetInnerHTML={{ __html: formatTextForDisplay(alert.purpose) }} />
                </div>
            )}
            {alert.instruction && (
                <div>
                    <h4 className="font-semibold text-lg mb-1">Instruction / Action Required</h4>
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md break-words" dangerouslySetInnerHTML={{ __html: formatTextForDisplay(alert.instruction) }} />
                </div>
            )}
            {(alert.reviewDate || reviewerName) && (
                <div>
                    <h4 className="font-semibold text-lg mb-1">Review Information</h4>
                     <div className="text-sm text-muted-foreground space-y-1">
                        {alert.reviewDate && <p><strong>Review Date:</strong> {format(parseISO(alert.reviewDate), 'PPP')}</p>}
                        {reviewerName && <p><strong>Reviewer:</strong> {reviewerName}</p>}
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="no-print">
            <div>
                <h4 className="text-base font-semibold mb-2">Acknowledged By ({alert.readBy.length})</h4>
                {alert.readBy.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                    {alert.readBy.map((ack, index) => (
                        <Badge key={`${ack.userId}-${index}`} variant="secondary">
                            {userMap.get(ack.userId) || ack.userId}
                            {ack.date ? ` on ${format(parseISO(ack.date), 'PPP p')}` : ''}
                        </Badge>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No acknowledgements yet.</p>
                )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

AlertDetailPage.title = "Alert Details";
