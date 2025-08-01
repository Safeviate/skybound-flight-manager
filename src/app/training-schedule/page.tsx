
'use client';

import React, { useEffect, useState } from 'react';
import { TrainingSchedulePageContent } from './training-schedule-client';
import type { Aircraft, Booking, User } from '@/lib/types';
import { getTrainingScheduleData } from './data';
import { useUser } from '@/context/user-provider';

export default function TrainingSchedulePage() {
  const { company } = useUser();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchData = React.useCallback(async () => {
    if (company) {
      const { aircraft, bookings, users } = await getTrainingScheduleData(company.id);
      setAircraft(aircraft);
      setBookings(bookings);
      setUsers(users);
    }
  }, [company]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return <TrainingSchedulePageContent aircraft={aircraft} bookings={bookings} users={users} onBookingCreated={fetchData} />;
}

TrainingSchedulePage.title = "Training Schedule";
