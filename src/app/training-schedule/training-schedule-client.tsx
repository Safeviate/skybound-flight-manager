
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Aircraft, Booking, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TrainingSchedulePageContentProps {
  aircraft: Aircraft[];
  bookings: Booking[];
  users: User[];
  onBookingCreated: () => void;
}

export function TrainingSchedulePageContent({ aircraft, bookings, users, onBookingCreated }: TrainingSchedulePageContentProps) {
  const { company } = useUser();
  const { toast } = useToast();
  const [bookingSlot, setBookingSlot] = useState<{ aircraft: Aircraft, time: string } | null>(null);

  useEffect(() => {
    const calendarBtn = document.getElementById('showCalendarBtn');
    const ganttBtn = document.getElementById('showGanttBtn');
    const calendarView = document.getElementById('calendarView');
    const ganttView = document.getElementById('ganttView');

    function switchView(viewToShow: 'calendar' | 'gantt') {
        if (calendarView && ganttView && calendarBtn && ganttBtn) {
            if (viewToShow === 'calendar') {
                calendarView.style.display = 'block';
                ganttView.style.display = 'none';
                calendarBtn.classList.add('active');
                ganttBtn.classList.remove('active');
            } else {
                calendarView.style.display = 'none';
                ganttView.style.display = 'block';
                calendarBtn.classList.remove('active');
                ganttBtn.classList.add('active');
            }
        }
    }

    calendarBtn?.addEventListener('click', () => switchView('calendar'));
    ganttBtn?.addEventListener('click', () => switchView('gantt'));

    return () => {
        calendarBtn?.removeEventListener('click', () => switchView('calendar'));
        ganttBtn?.removeEventListener('click', () => switchView('gantt'));
    };
  }, []);

  const timeSlots = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);
  
  const getBookingForSlot = (aircraftId: string, time: string) => {
    const hour = parseInt(time.split(':')[0], 10);
    return bookings.find(b => {
      if (b.aircraft !== aircraftId) return false;
      const startHour = parseInt(b.startTime.split(':')[0], 10);
      const endHour = parseInt(b.endTime.split(':')[0], 10);
      return hour >= startHour && hour < endHour;
    });
  };

  const calculateColSpan = (booking: Booking, time: string) => {
      const startHour = parseInt(booking.startTime.split(':')[0], 10);
      const endHour = parseInt(booking.endTime.split(':')[0], 10);
      const currentHour = parseInt(time.split(':')[0], 10);
      if (startHour !== currentHour) return 0;
      return endHour - startHour;
  };

  const getBookingLabel = (booking: Booking) => {
    if (booking.purpose === 'Maintenance') {
      return `Maintenance: ${booking.maintenanceType || 'Scheduled'}`;
    }
    return `${booking.purpose}: ${booking.student} w/ ${booking.instructor}`;
  };
  
  const getBookingVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500';
      case 'Maintenance': return 'bg-yellow-500';
      case 'Private': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleNewBooking = async (data: Omit<Booking, 'id' | 'companyId' | 'status'>) => {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    
    try {
        const newBooking = {
            ...data,
            companyId: company.id,
            status: 'Approved',
        };
        await addDoc(collection(db, `companies/${company.id}/bookings`), newBooking);
        toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
        onBookingCreated(); // Refresh data
        setBookingSlot(null); // Close dialog
    } catch (error) {
        console.error("Error creating booking:", error);
        toast({ variant: 'destructive', title: 'Booking Failed', description: 'Could not create the booking.' });
    }
  };

  return (
    <>
      <style jsx>{`
        .container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #212529;
        }
        .view-switcher { margin-bottom: 20px; }
        .view-switcher button { padding: 10px 15px; font-size: 16px; cursor: pointer; border: 1px solid #0d6efd; background-color: #ffffff; color: #0d6efd; border-radius: 5px; margin-right: 10px; transition: background-color 0.2s, color 0.2s; }
        .view-switcher button.active, .view-switcher button:hover { background-color: #0d6efd; color: #ffffff; }
        table { width: 100%; border-collapse: collapse; background-color: #ffffff; }
        th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; min-width: 80px; }
        th { background-color: #e9ecef; text-align: center; }
        td.empty-slot { cursor: pointer; transition: background-color 0.2s; }
        td.empty-slot:hover { background-color: #e9ecef; }
        h2 { margin-top: 20px; }
        .gantt-container { overflow-x: auto; border: 1px solid #dee2e6; border-radius: 5px; }
        .gantt-table { width: 1800px; }
        .gantt-table th:first-child, .gantt-table td:first-child { position: -webkit-sticky; position: sticky; left: 0; z-index: 2; background-color: #f1f3f5; width: 150px; min-width: 150px; text-align: left; }
        .gantt-table thead th { z-index: 3; }
        .gantt-bar { color: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
      <div className="container">
        <div className="view-switcher">
            <button id="showCalendarBtn" className="active">Calendar View</button>
            <button id="showGanttBtn">Gantt Chart View</button>
        </div>

        <div id="calendarView">
            <h2>Monthly Calendar</h2>
            <table>
                <thead>
                    <tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>
                </thead>
                <tbody>
                    <tr><td></td><td></td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>
                    <tr><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td></tr>
                    <tr><td>13</td><td>14</td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td></tr>
                    <tr><td>20</td><td>21</td><td>22</td><td>23</td><td>24</td><td>25</td><td>26</td></tr>
                    <tr><td>27</td><td>28</td><td>29</td><td>30</td><td>31</td><td></td><td></td></tr>
                </tbody>
            </table>
        </div>

        <div id="ganttView" style={{ display: 'none' }}>
            <h2>Daily Schedule</h2>
            <div className="gantt-container">
                <table className="gantt-table">
                    <thead>
                        <tr>
                            <th>Aircraft</th>
                            {timeSlots.map(time => <th key={time}>{time}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {aircraft.map(ac => {
                          const renderedSlots = new Set();
                          return (
                           <tr key={ac.id}>
                                <td>{ac.tailNumber}</td>
                                {timeSlots.map(time => {
                                  if (renderedSlots.has(time)) return null;

                                  const booking = getBookingForSlot(ac.id, time);
                                  if (booking) {
                                    const colSpan = calculateColSpan(booking, time);
                                    if (colSpan > 0) {
                                      for (let i = 1; i < colSpan; i++) {
                                        const nextHour = parseInt(time.split(':')[0], 10) + i;
                                        renderedSlots.add(`${nextHour.toString().padStart(2, '0')}:00`);
                                      }
                                      return (
                                        <td key={time} colSpan={colSpan}>
                                          <div className={`gantt-bar ${getBookingVariant(booking.purpose)}`}>
                                            {getBookingLabel(booking)}
                                          </div>
                                        </td>
                                      )
                                    }
                                  }
                                  return (
                                    <td key={time} className="empty-slot" onClick={() => setBookingSlot({ aircraft: ac, time })}></td>
                                  );
                                })}
                            </tr>
                          )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
       <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Creating a booking for {bookingSlot?.aircraft.tailNumber} at {bookingSlot?.time}
            </DialogDescription>
          </DialogHeader>
          {bookingSlot && (
            <NewBookingForm
              aircraft={bookingSlot.aircraft}
              startTime={bookingSlot.time}
              users={users}
              onSubmit={handleNewBooking}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
