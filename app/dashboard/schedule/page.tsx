'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, startOfWeek, addDays, parseISO, isSameDay, isBefore } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { schedulesAPI } from '@/lib/api/index';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { updateJobStatus } from '@/lib/utils/jobs';
import { toast } from 'react-hot-toast';

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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  useEffect(() => {
    fetchSchedules();

    // Check for completed jobs every minute
    const interval = setInterval(checkCompletedJobs, 60000);

    return () => clearInterval(interval);
  }, [weekStart]);

  const checkCompletedJobs = async () => {
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
          await updateJobStatus(schedule.job.id, schedule.id, 'completed');
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

  // Calculate week days based on selected date
  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    name: format(addDays(weekStart, i), 'EEEE'),
    shortDate: format(addDays(weekStart, i), 'MMM d'),
  }));

  const fetchSchedules = useCallback(async () => {
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
          job:jobs!inner (
            id,
            title,
            client:clients!inner (
              id,
              name
            ),
            status
          )
        `)
        .order('scheduled_date, start_time');

      if (error) {
        setLoading(false);
        return;
      }

      if (schedules) {
        const formattedSchedules = (schedules as unknown as RawSchedule[]).map((schedule): Schedule | null => {
          if (!schedule.job) return null;
          return {
            id: schedule.id,
            job_id: schedule.job_id,
            scheduled_date: schedule.scheduled_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status,
            job: {
              id: schedule.job.id,
              title: schedule.job.title,
              client: {
                id: schedule.job.client?.id || '',
                name: schedule.job.client?.name || 'Unknown Client'
              },
              status: schedule.job.status
            }
          };
        }).filter((s): s is Schedule => s !== null);

        setSchedules(formattedSchedules);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getSchedulesForTimeSlot = useCallback((date: Date, time: string) => {
    const matchingSchedules = schedules.filter(schedule => {
      const scheduleDate = parseISO(schedule.scheduled_date);
      const scheduleTime = schedule.start_time;
      const matches = isSameDay(scheduleDate, date) && scheduleTime === time;

      return matches;
    });

    return matchingSchedules;
  }, [schedules]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[95%] mx-auto px-4 py-8">
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
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                timeSlots.map((timeSlot) => {
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
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
