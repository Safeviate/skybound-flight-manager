
'use client';

import { NewAircraftForm } from '@/app/aircraft/new-aircraft-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function NewAircraftPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push('/aircraft');
    }

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Aircraft</CardTitle>
                        <CardDescription>
                            Fill out the form below to add a new aircraft to the fleet. This will also assign standard pre-flight and post-flight checklists to it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <NewAircraftForm onSuccess={handleSuccess} />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

NewAircraftPage.title = "Add New Aircraft";
