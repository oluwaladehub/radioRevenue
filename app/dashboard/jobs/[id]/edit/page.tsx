'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { JobForm } from '@/components/jobs/JobForm';
import { jobsAPI } from '@/lib/api';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type JobUpdate = Tables['jobs']['Update'];

// Import the JobFormData type from the JobForm component to ensure consistency
type JobFormData = {
  title: string;
  client: string;
  duration: string;
  airTime: string;
  rate: string;
  repeatDays: string[];
  description: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
};

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const [job, setJob] = useState<JobFormData | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobData = await jobsAPI.getJob(params.id as string);
        if (!jobData) {
          setError('Job not found');
          return;
        }
        
        setJob({
          title: jobData.title,
          client: jobData.client,
          duration: jobData.duration,
          airTime: jobData.air_time,
          rate: jobData.rate.toString(),
          repeatDays: jobData.repeat_days || [],
          description: jobData.description || '',
          status: jobData.status,
        });
      } catch (error) {
        console.error('Error fetching job:', error);
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchJob();
    }
  }, [params.id]);

  const handleSubmit = async (data: JobFormData) => {
    try {
      const updates: Partial<JobUpdate> = {
        title: data.title,
        client: data.client,
        duration: data.duration,
        air_time: data.airTime,
        rate: parseFloat(data.rate),
        repeat_days: data.repeatDays,
        description: data.description,
        status: data.status,
      };

      await jobsAPI.updateJob(params.id as string, updates);
      router.push('/dashboard/jobs');
    } catch (error) {
      console.error('Error updating job:', error);
      setError('Failed to update job');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Job</h1>
        </div>

        <JobForm
          initialData={job}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/jobs')}
        />
      </div>
    </DashboardLayout>
  );
}
