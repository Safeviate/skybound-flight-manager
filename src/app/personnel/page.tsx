import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Wrench, Shield, Award, UserPlus, CalendarOff } from 'lucide-react';
import Link from 'next/link';

const personnelStats = [
  {
    title: 'Total Staff',
    value: '8',
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Instructors',
    value: '4',
    icon: <UserCheck className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Maintenance Crew',
    value: '2',
    icon: <Wrench className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Admins',
    value: '2',
    icon: <Shield className="h-8 w-8 text-primary" />,
  },
];

const upcomingCertifications = [
    { name: 'Mike Ross', certification: 'CFI Renewal', due: 'in 2 weeks' },
    { name: 'Hank Hill', certification: 'A&P License', due: 'in 1 month' },
    { name: 'Sarah Connor', certification: 'Medical Class 1', due: 'in 3 months' },
];

const recentPersonnelActivity = [
    { type: 'New Hire', description: 'Laura Croft has joined as an Instructor.', time: '2 days ago' },
    { type: 'Leave', description: 'Hank Hill is on leave until next Monday.', time: 'Yesterday' },
    { type: 'Certification', description: 'Mike Ross updated his First Aid certification.', time: 'This morning' },
];

export default function PersonnelDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Personnel Dashboard" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {personnelStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Certification Renewals</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {upcomingCertifications.map((cert, index) => (
                            <li key={index} className="flex items-center space-x-4">
                                <div className="p-2 bg-accent/20 rounded-lg"><Award className="h-5 w-5 text-accent-foreground"/></div>
                                <div>
                                    <p className="font-medium">{cert.name} - {cert.certification}</p>
                                    <p className="text-sm text-muted-foreground">Due {cert.due}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {recentPersonnelActivity.map((activity, index) => (
                            <li key={index} className="flex items-start space-x-4">
                                <div className="p-2 bg-secondary rounded-lg">
                                    {activity.type === 'New Hire' && <UserPlus className="h-5 w-5 text-secondary-foreground" />}
                                    {activity.type === 'Leave' && <CalendarOff className="h-5 w-5 text-secondary-foreground" />}
                                    {activity.type === 'Certification' && <Award className="h-5 w-5 text-secondary-foreground" />}
                                </div>
                                <div>
                                    <p className="font-medium">{activity.type}</p>
                                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                                </div>
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
