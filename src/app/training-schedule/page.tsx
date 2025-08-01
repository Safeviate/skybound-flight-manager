
'use client';

import React, { useEffect, useState } from 'react';
import { TrainingSchedulePageContent } from './training-schedule-client';
import type { Aircraft, Booking } from '@/lib/types';
import { getTrainingScheduleData } from './data';
import { useUser } from '@/context/user-provider';

export default function TrainingSchedulePage() {
  const { company } = useUser();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (company) {
      getTrainingScheduleData(company.id).then(({ aircraft, bookings }) => {
        setAircraft(aircraft);
        setBookings(bookings);
      });
    }
  }, [company]);
  
  return <TrainingSchedulePageContent aircraft={aircraft} bookings={bookings} />;
}

TrainingSchedulePage.title = "Training Schedule";
