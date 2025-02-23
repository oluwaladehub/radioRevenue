'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { JobForm } from '@/components/jobs/JobForm';
import { jobsAPI, schedulesAPI } from '@/lib/api/index';
import { useAuth } from '@/context/AuthContext';
import { addDays, format, parseISO } from 'date-fns';
import type { Database } from '@/lib/database.types';

type JobFormData = {
  title: string;
  client_id: string;
  duration: string;
  air_time: string;
  rate: number;
  schedule_dates: Date[];
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
};

const dayToNumber: Record<string, number> = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 0
};

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: JobFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a job');
      router.push('/login');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    const jobToastId = 'jobSubmit';
    
    try {
      // Create job
      toast.loading('Creating job...', { id: jobToastId });
      const job = await jobsAPI.createJob({
        title: data.title,
        client_id: data.client_id,
        duration: data.duration,
        air_time: data.air_time,
        rate: data.rate,
        description: data.description,
        status: data.status,
        repeat_days: data.schedule_dates.map(date => format(date, 'yyyy-MM-dd')),
        created_by: user.id,
      });

      // Create schedules for all selected dates
      if (data.schedule_dates.length > 0) {
        toast.loading(`Creating schedules for ${data.schedule_dates.length} dates...`, { id: jobToastId });
        
        // Calculate end time based on duration and start time
        const [startHour, startMinute] = data.air_time.split(':').map(Number);
        const durationMatch = data.duration.match(/(\d+)\s*(min|sec)/i);
        let endHour = startHour;
        let endMinute = startMinute;
        
        if (durationMatch) {
          const [, amount, unit] = durationMatch;
          if (unit.toLowerCase() === 'min') {
            endMinute += parseInt(amount);
          } else if (unit.toLowerCase() === 'sec') {
            endMinute += Math.ceil(parseInt(amount) / 60);
          }
          
          // Handle minute overflow
          if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
          }
          
          // Handle 24-hour format
          if (endHour >= 24) {
            endHour = endHour % 24;
          }
        }

        // Create schedules for each selected date
        const schedulePromises = data.schedule_dates.map(async (scheduleDate) => {
          const formattedDate = format(scheduleDate, 'yyyy-MM-dd');
          const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

          try {
            await schedulesAPI.createSchedule({
              job_id: job.id,
              scheduled_date: formattedDate,
              start_time: startTime,
              end_time: endTime,
              status: 'upcoming',
              created_by: user.id
            });
          } catch (error) {
            console.error(`Error creating schedule for ${formattedDate}:`, error);
            throw error;
          }
        });

        try {
          await Promise.all(schedulePromises);
        } catch (error) {
          console.error('Error creating some schedules:', error);
          toast.error('Job created but some schedules failed to create', { id: jobToastId });
          router.push('/dashboard/jobs');
          return;
        }
      }

      toast.success(`Job and ${data.schedule_dates.length} schedules created successfully!`, { id: jobToastId });
      router.push('/dashboard/jobs');
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job', { id: jobToastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/jobs');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">Create New Job</h1>
        <JobForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </DashboardLayout>
  );
}
