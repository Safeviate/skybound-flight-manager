
import { getAircraftPageData } from '@/app/aircraft/data';
import type { Aircraft } from '@/lib/types';
import { TrainingScheduleClient } from './training-schedule-client';

async function getInitialData(companyId: string): Promise<Aircraft[]> {
    try {
        const allAircraft = await getAircraftPageData(companyId);
        // Filter for active aircraft as requested
        return allAircraft.filter(ac => ac.status !== 'Archived');
    } catch (error) {
        console.error("Failed to fetch initial data for training schedule:", error);
        return [];
    }
}

export default async function TrainingSchedulePage() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const activeAircraft = await getInitialData(companyId);

    return <TrainingScheduleClient aircraft={activeAircraft} />;
}

TrainingSchedulePage.title = "Training Schedule";
