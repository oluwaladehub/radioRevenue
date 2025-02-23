'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { updateJobStatuses } from '@/lib/utils/cron';
import type { Database } from '@/lib/database.types';

type DashboardStats = {
  totalRevenue: number;
  totalJobs: number;
  activeJobs: number;
  upcomingSchedules: number;
  recentJobs: Array<Job>;
  recentSchedules: Array<Schedule>;
};

type Job = Database['public']['Tables']['jobs']['Row'] & {
  client: {
    name: string;
  };
};

type Schedule = Database['public']['Tables']['schedules']['Row'] & {
  job: {
    title: string;
    client: {
      name: string;
    };
  };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalJobs: 0,
    activeJobs: 0,
    upcomingSchedules: 0,
    recentJobs: [],
    recentSchedules: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('dashboard_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'jobs' 
        }, 
        () => loadDashboardStats()
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        () => loadDashboardStats()
      )
      .subscribe();

    // Update job statuses every minute
    const updateInterval = setInterval(async () => {
      try {
        await updateJobStatuses();
      } catch (error) {
        console.error('Failed to update job statuses:', error);
      }
    }, 60000); // Every minute

    // Initial update
    updateJobStatuses().catch(console.error);

    return () => {
      subscription.unsubscribe();
      clearInterval(updateInterval);
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch recent jobs with client information
      const { data: recentJobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          client:clients (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (jobsError) throw jobsError;

      // Fetch upcoming schedules
      const { data: recentSchedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          job:jobs (
            title,
            client:clients (
              name
            )
          )
        `)
        .gte('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (schedulesError) throw schedulesError;

      // Get total revenue (from completed jobs)
      const { data: revenue } = await supabase
        .from('jobs')
        .select('rate')
        .eq('status', 'completed');

      const totalRevenue = revenue?.reduce((sum, job) => sum + job.rate, 0) || 0;

      // Get counts
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      const { count: activeJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: upcomingSchedules } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', todayStr)
        .eq('status', 'upcoming');

      setStats({
        totalRevenue,
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        upcomingSchedules: upcomingSchedules || 0,
        recentJobs: recentJobs as Job[],
        recentSchedules: recentSchedules as Schedule[],
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Jobs</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalJobs}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Jobs</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.activeJobs}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Upcoming Schedules</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.upcomingSchedules}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Jobs */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">Recent Jobs</h3>
            </div>
            <div className="border-t border-gray-200">
              <ul role="list" className="divide-y divide-gray-200">
                {stats.recentJobs.map((job) => (
                  <li key={job.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-500">{job.client?.name}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : job.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent Schedules */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Schedules</h3>
            </div>
            <div className="border-t border-gray-200">
              <ul role="list" className="divide-y divide-gray-200">
                {stats.recentSchedules.map((schedule) => (
                  <li key={schedule.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{schedule.job?.title}</p>
                        <p className="text-sm text-gray-500">
                          {schedule.job?.client?.name} • {schedule.start_time} - {schedule.end_time}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : schedule.status === 'live'
                            ? 'bg-blue-100 text-blue-800'
                            : schedule.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{formatDate(schedule.scheduled_date)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
