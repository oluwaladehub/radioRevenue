'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { JobForm } from '@/components/jobs/JobForm';
import { jobsAPI } from '@/lib/api';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type JobUpdate = Tables['jobs']['Update'];

interface JobFormData {
  title: string;
  client_id: string;
  client_name?: string;
  client_contact_person?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  duration: string;
  air_time: string;
  rate: number;
  schedule_dates: Date[];
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

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
          client_id: jobData.client_id,
          duration: jobData.duration,
          air_time: jobData.air_time,
          rate: jobData.rate,
          schedule_dates: [], // You might want to fetch and set actual schedule dates
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
        client_id: data.client_id,
        duration: data.duration,
        air_time: data.air_time,
        rate: data.rate,
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
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center text-red-600">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Job</h1>
        <JobForm
          initialData={job}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/jobs')}
        />
      </div>
    </DashboardLayout>
  );
}
