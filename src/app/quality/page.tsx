import Header from '@/components/layout/header';
import { QualityAuditAnalyzer } from './quality-audit-analyzer';

export default function QualityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Quality Management" />
      <main className="flex-1 p-4 md:p-8">
        <QualityAuditAnalyzer />
      </main>
    </div>
  );
}
