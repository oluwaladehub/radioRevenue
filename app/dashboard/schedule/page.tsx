'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO, isSameDay, isBefore } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { schedulesAPI } from '@/lib/api/index';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { updateJobStatus } from '@/lib/utils/jobs';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type RawSchedule = {
  id: string;
  job_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  job: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    } | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  } | null;
};

type Schedule = {
  id: string;
  job_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  job: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  };
};

type ScheduleStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00:00`;
});

const formatTimeDisplay = (time: string) => {
  // Convert "HH:mm:ss" to "HH:mm"
  return time.substring(0, 5);
};

const statusColors: Record<ScheduleStatus, string> = {
  'upcoming': 'bg-blue-100 text-blue-800',
  'live': 'bg-green-100 text-green-800',
  'completed': 'bg-gray-100 text-gray-800',
  'cancelled': 'bg-red-100 text-red-800',
};

const getHourFromTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours;
};

const isScheduleInHourSlot = (scheduleTime: string, slotHour: number) => {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  return hours === slotHour;
};

export default function SchedulePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const weekEnd = addDays(weekStart, 6);
      const { data: rawSchedules, error } = await supabase
        .from('schedules')
        .select(`
          *,
          job:jobs (
            id,
            title,
            status,
            client:clients (
              id,
              name
            )
          )
        `)
        .eq('created_by', user.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date')
        .order('start_time');

      if (error) throw error;

      // Filter out schedules with null jobs or clients
      const validSchedules = (rawSchedules as RawSchedule[])
        .filter(schedule => schedule.job && schedule.job.client)
        .map(schedule => ({
          ...schedule,
          job: {
            ...schedule.job!,
            client: schedule.job!.client!
          }
        }));

      setSchedules(validSchedules as Schedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [weekStart, router]);

  // Update weekStart when selectedDate changes
  useEffect(() => {
    const newWeekStart = startOfWeek(selectedDate);
    setWeekStart(newWeekStart);
  }, [selectedDate]);

  // Fetch schedules when weekStart changes
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Check for completed jobs every minute
  useEffect(() => {
    const checkCompletedJobs = () => {
      const now = new Date();
      const updatedSchedules = [...schedules];
      let hasUpdates = false;

      for (const schedule of updatedSchedules) {
        const scheduleEndTime = parseISO(schedule.scheduled_date + 'T' + schedule.end_time);
        
        if (isBefore(scheduleEndTime, now) && 
            schedule.status !== 'completed' && 
            schedule.status !== 'cancelled' &&
            schedule.job?.status !== 'completed') {
          try {
            updateJobStatus(schedule.job.id, schedule.id, 'completed');
            schedule.status = 'completed';
            schedule.job.status = 'completed';
            hasUpdates = true;
          } catch (error) {
            console.error('Error auto-updating job status:', error);
          }
        }
      }

      if (hasUpdates) {
        setSchedules(updatedSchedules);
      }
    };

    const interval = setInterval(checkCompletedJobs, 60000);
    return () => clearInterval(interval);
  }, [schedules]);

  const handleCompleteJob = async (schedule: Schedule) => {
    try {
      await updateJobStatus(schedule.job.id, schedule.id, 'completed');
      toast.success('Job marked as completed');
      
      // Update local state
      setSchedules(prev => prev.map(s => {
        if (s.id === schedule.id) {
          return {
            ...s,
            status: 'completed',
            job: {
              ...s.job,
              status: 'completed'
            }
          };
        }
        return s;
      }));
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  // Calculate week days based on weekStart
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    name: format(addDays(weekStart, i), 'EEEE'),
    shortDate: format(addDays(weekStart, i), 'MMM d'),
  })), [weekStart]);

  const getSchedulesForTimeSlot = useCallback((date: Date, time: string) => {
    return schedules.filter(schedule => {
      const scheduleDate = parseISO(schedule.scheduled_date);
      return isSameDay(scheduleDate, date) && schedule.start_time === time;
    });
  }, [schedules]);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
            <p className="mt-2 text-sm text-gray-700">
              Weekly schedule of all your radio jobs.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => router.push('/dashboard/schedule/new')}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Schedule
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous Week
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Next Week
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No schedules found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first schedule.
            </p>
            <button
              onClick={() => router.push('/dashboard/schedule/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create New Schedule
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.name}
                  className={`py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 ${
                    isSameDay(day.date, new Date()) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>{day.name}</div>
                  <div className="text-gray-900 mt-1">{day.shortDate}</div>
                </div>
              ))}
            </div>

            {/* Time slots */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((timeSlot) => {
                const slotHour = getHourFromTime(timeSlot);
                
                return (
                  <div key={timeSlot} className="grid grid-cols-8">
                    <div className="py-3 px-4 text-sm text-gray-500">
                      {formatTimeDisplay(timeSlot)}
                    </div>
                    {weekDays.map((day) => {
                      const daySchedules = schedules.filter(schedule => {
                        const scheduleDate = parseISO(schedule.scheduled_date);
                        const [scheduleHour] = schedule.start_time.split(':').map(Number);
                        return isSameDay(scheduleDate, day.date) && scheduleHour === slotHour;
                      });

                      return (
                        <div
                          key={day.name}
                          className={`py-3 px-2 border-l border-gray-200 min-h-[4rem] ${
                            isSameDay(day.date, new Date()) ? 'bg-blue-50' : ''
                          }`}
                        >
                          {daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={`p-2 mb-1 rounded-lg border ${statusColors[schedule.status]} shadow-sm`}
                              style={{
                                marginTop: `${(parseInt(schedule.start_time.split(':')[1]) / 60) * 4}rem`
                              }}
                            >
                              <div className="font-medium text-sm">{schedule.job.title}</div>
                              <div className="text-xs mt-1">{schedule.job.client.name}</div>
                              <div className="text-xs mt-1">
                                {formatTimeDisplay(schedule.start_time)} - {formatTimeDisplay(schedule.end_time)}
                              </div>
                              {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleCompleteJob(schedule)}
                                  className="mt-2 w-full px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
