import Header from '@/components/layout/header';
import { SafetyReportAnalyzer } from './safety-report-analyzer';

export default function SafetyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Safety Management" />
      <main className="flex-1 p-4 md:p-8">
        <SafetyReportAnalyzer />
      </main>
    </div>
  );
}
