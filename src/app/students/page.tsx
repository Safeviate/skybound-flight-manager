import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Student } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

const studentData: Student[] = [
  { id: '1', name: 'John Doe', instructor: 'Mike Ross', flightHours: 45.5, progress: 75 },
  { id: '2', name: 'Jane Smith', instructor: 'Sarah Connor', flightHours: 22.0, progress: 40 },
  { id: '3', name: 'Peter Jones', instructor: 'Mike Ross', flightHours: 60.2, progress: 90 },
  { id: '4', name: 'Emily White', instructor: 'Laura Croft', flightHours: 10.5, progress: 20 },
  { id: '5', name: 'Chris Green', instructor: 'Sarah Connor', flightHours: 35.8, progress: 65 },
];

export default function StudentsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Student Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Student Roster</CardTitle>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Flight Hours</TableHead>
                  <TableHead>Training Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentData.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.instructor}</TableCell>
                    <TableCell>{student.flightHours.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={student.progress} className="w-2/3" />
                        <span>{student.progress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
