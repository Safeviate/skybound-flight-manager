
import { StudentProfilePage } from './student-profile-page';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as StudentUser } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getStudentData(companyId: string, studentId: string): Promise<StudentUser | null> {
    const studentRef = doc(db, `companies/${companyId}/students`, studentId);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        return null;
    }
    return { ...studentSnap.data(), id: studentSnap.id } as StudentUser;
}

export default async function StudentProfileContainer({ params }: { params: { id: string } }) {
    const companyId = 'skybound-aero'; 
    const student = await getStudentData(companyId, params.id);

    if (!student) {
        notFound();
    }
    
    return <StudentProfilePage initialStudent={student} />;
}

StudentProfileContainer.title = 'Student Profile';
