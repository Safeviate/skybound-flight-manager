
import { getTrainingScheduleData } from './data';
import { TrainingSchedulePageContent } from './training-schedule-client';
import type { Aircraft } from '@/lib/types';

async function getInitialData(companyId: string): Promise<Aircraft[]> {
    try {
        return await getTrainingScheduleData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for training schedule:", error);
        return [];
    }
}

export default async function TrainingSchedulePage() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const initialAircraft = await getInitialData(companyId);
    
    return <TrainingSchedulePageContent aircraft={initialAircraft} />;
}

TrainingSchedulePage.title = "Training Schedule";
