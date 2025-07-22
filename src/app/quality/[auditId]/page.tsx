
'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { qualityAuditData } from '@/lib/data-provider';
import type { QualityAudit, NonConformanceIssue } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks } from 'lucide-react';

export default function QualityAuditDetailPage({ params }: { params: { auditId: string } }) {
  const router = useRouter();
  const audit = qualityAuditData.find(a => a.id === params.auditId);

  if (!audit) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Audit Not Found" />
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested quality audit could not be found.</p>
        </main>
      </div>
    );
  }
  
  const getStatusVariant = (status: QualityAudit['status']) => {
    switch (status) {
      case 'Compliant': return 'success';
      case 'With Findings': return 'warning';
      case 'Non-Compliant': return 'destructive';
      default: return 'outline';
    }
  };

  const getIssueCategoryIcon = (category: NonConformanceIssue['category']) => {
    switch (category) {
        case 'Documentation': return <ListChecks className="h-5 w-5 text-blue-500" />;
        case 'Procedural': return <ListChecks className="h-5 w-5 text-orange-500" />;
        case 'Equipment': return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case 'Training': return <ListChecks className="h-5 w-5 text-purple-500" />;
        default: return <ListChecks className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`Audit Details: ${audit.id}`} />
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Quality Audit Report: {audit.id}</CardTitle>
                <CardDescription>
                  Detailed report for the {audit.type} audit conducted on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(audit.status)} className="text-base">
                {audit.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-6">
              <div>
                <p className="font-semibold text-muted-foreground">Area</p>
                <p>{audit.area}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Type</p>
                <p>{audit.type}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Auditor</p>
                <p>{audit.auditor}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Compliance Score</p>
                <p className="font-bold text-lg">{audit.complianceScore}%</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-6">
                <h3 className="font-semibold">Audit Summary</h3>
                <p className="text-muted-foreground p-3 bg-muted rounded-md">{audit.summary}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Non-Conformance Issues
                </CardTitle>
                <CardDescription>
                    The following issues were identified during the audit. Corrective actions should be tracked.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {audit.nonConformanceIssues.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-32">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {audit.nonConformanceIssues.map(issue => (
                                <TableRow key={issue.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {getIssueCategoryIcon(issue.category)}
                                        {issue.category}
                                    </TableCell>
                                    <TableCell>{issue.description}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">Open</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                         <CheckCircle className="h-10 w-10 text-success mb-2" />
                        <p className="text-muted-foreground font-semibold">No non-conformance issues were identified.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
