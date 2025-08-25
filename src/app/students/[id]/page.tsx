
'use client';

import { StudentProfilePage } from './student-profile-page';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as StudentUser } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';

export default function StudentProfileContainer() {
    const { company, loading: userLoading } = useUser();
    const params = useParams();
    const studentId = params.id as string;
    const [student, setStudent] = useState<StudentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (company && studentId) {
                setLoading(true);
                const studentRef = doc(db, `companies/${company.id}/students`, studentId);
                const studentSnap = await getDoc(studentRef);
                if (!studentSnap.exists()) {
                    setStudent(null);
                } else {
                    setStudent({ ...studentSnap.data(), id: studentSnap.id } as StudentUser);
                }
                setLoading(false);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, studentId, userLoading]);
    
    if (loading || userLoading) {
        return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>Loading profile...</p></main>;
    }

    if (!student) {
        notFound();
    }
    
    return <StudentProfilePage initialStudent={student} />;
}

StudentProfileContainer.title = 'Student Profile';
