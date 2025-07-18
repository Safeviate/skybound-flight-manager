
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Users, Calendar, ShieldAlert } from 'lucide-react';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const stats = [
  {
    title: 'Total Aircraft',
    value: '12',
    icon: <Plane className="h-8 w-8 text-primary" />,
    href: '/aircraft',
  },
  {
    title: 'Active Students',
    value: '45',
    icon: <Users className="h-8 w-8 text-primary" />,
    href: '/students',
  },
  {
    title: 'Upcoming Bookings',
    value: '8',
    icon: <Calendar className="h-8 w-8 text-primary" />,
    href: '/bookings',
  },
  {
    title: 'Open Safety Reports',
    value: '2',
    icon: <ShieldAlert className="h-8 w-8 text-destructive" />,
    href: '/safety',
  },
];

const recentActivities = [
    { type: 'New Booking', description: 'Cessna 172 (N12345) for John D.', time: '10 min ago' },
    { type: 'New Student', description: 'Jane S. has been registered.', time: '1 hour ago' },
    { type: 'Safety Report', description: 'New report filed for runway incursion.', time: '3 hours ago' },
    { type: 'Aircraft Update', description: 'Piper Arrow (N54321) is now in maintenance.', time: 'Yesterday' },
];

export default function Dashboard() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <p>Loading...</p>
          </div>
      )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Dashboard" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link href={stat.href} key={stat.title}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
            </CardHeader>
            <CardContent>
               <ul className="space-y-4">
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Calendar className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Flight Training with John D.</p>
                        <p className="text-sm text-muted-foreground">Cessna 172 | Today at 14:00</p>
                    </div>
                 </li>
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Plane className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Maintenance Check</p>
                        <p className="text-sm text-muted-foreground">Piper Arrow | Tomorrow at 09:00</p>
                    </div>
                 </li>
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Calendar className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Solo Flight - Jane S.</p>
                        <p className="text-sm text-muted-foreground">Diamond DA40 | Tomorrow at 11:00</p>
                    </div>
                 </li>
               </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <li key={index}>
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
