import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function MyDashboardPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>My Dashboard</CardTitle>
          <CardDescription>
            Your personal dashboard. More content will be added here soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Dashboard content coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

MyDashboardPage.title = "My Dashboard";
export default MyDashboardPage;
