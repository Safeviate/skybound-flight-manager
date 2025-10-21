
'use client';

import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';

export default function FleetTrackPage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ aircraft: Aircraft[] }>({
        aircraft: [],
    });
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getFleetTrackPageData(company.id);
                setInitialData(data);
            }
            setDataLoading(false);
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

  if (dataLoading || userLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>Loading fleet data...</p>
      </main>
    );
  }

  return <FleetTrackPageContent 
            initialAircraft={initialData.aircraft}
         />;
}

FleetTrackPage.title = "Fleet Track";
