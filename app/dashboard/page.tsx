'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { updateJobStatuses } from '@/lib/utils/cron';
import { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type Jobs = Tables['jobs']['Row'];
type Clients = Tables['clients']['Row'];
type Schedules = Tables['schedules']['Row'];

type JobWithClient = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client: {
    name: string;
  } | null;
};

type ScheduleWithJob = {
  id: string;
  status: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  job: {
    title: string;
    client: {
      name: string;
    } | null;
  } | null;
};

type DashboardStats = {
  totalRevenue: number;
  totalJobs: number;
  activeJobs: number;
  upcomingSchedules: number;
  recentJobs: JobWithClient[];
  recentSchedules: ScheduleWithJob[];
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
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
    checkNewUser();
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

  const checkNewUser = async () => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has any jobs or clients
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setIsNewUser(!jobs?.length && !clients?.length);
    } catch (error) {
      console.error('Error checking new user status:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }
      
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Run all queries in parallel
      const [
        recentJobsResult,
        recentSchedulesResult,
        revenueResult,
        totalJobsResult,
        activeJobsResult,
        upcomingSchedulesResult
      ] = await Promise.all([
        // Recent jobs query
        (supabase
          .from('jobs')
          .select(`
            id,
            title,
            status,
            created_at,
            client:clients (
              name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5)).then(result => ({
            data: result.data as (Omit<Database['public']['Tables']['jobs']['Row'], 'client'> & {
              client: { name: string } | null
            })[] | null,
            error: result.error
          })),

        // Upcoming schedules query
        (supabase
          .from('schedules')
          .select(`
            id,
            status,
            scheduled_date,
            start_time,
            end_time,
            job:jobs (
              title,
              client:clients (
                name
              )
            )
          `)
          .eq('status', 'upcoming')
          .order('scheduled_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5)).then(result => ({
            data: result.data as (Omit<Database['public']['Tables']['schedules']['Row'], 'job'> & {
              job: {
                title: string;
                client: { name: string } | null;
              } | null;
            })[] | null,
            error: result.error
          })),

        // Total revenue query (from completed jobs)
        supabase
          .from('jobs')
          .select('rate')
          .eq('status', 'completed'),

        // Total jobs count
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true }),

        // Active jobs count
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'in_progress'),

        // Upcoming schedules count
        supabase
          .from('schedules')
          .select('id', { count: 'exact', head: true })
          .gte('scheduled_date', todayStr)
      ]);

      // Check for errors
      if (recentJobsResult.error) throw recentJobsResult.error;
      if (recentSchedulesResult.error) throw recentSchedulesResult.error;
      if (revenueResult.error) throw revenueResult.error;
      if (totalJobsResult.error) throw totalJobsResult.error;
      if (activeJobsResult.error) throw activeJobsResult.error;
      if (upcomingSchedulesResult.error) throw upcomingSchedulesResult.error;

      // Calculate total revenue
      const totalRevenue = revenueResult.data?.reduce((sum, job) => sum + (job.rate || 0), 0) || 0;

      // Transform the data to match our types
      const transformedJobs: JobWithClient[] = (recentJobsResult.data || []).map(job => ({
        id: job.id,
        title: job.title,
        status: job.status,
        created_at: job.created_at,
        client: job.client
      }));

      const transformedSchedules: ScheduleWithJob[] = (recentSchedulesResult.data || []).map(schedule => ({
        id: schedule.id,
        status: schedule.status,
        scheduled_date: schedule.scheduled_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        job: schedule.job ? {
          title: schedule.job.title,
          client: schedule.job.client
        } : null
      }));

      setStats({
        totalRevenue,
        totalJobs: totalJobsResult.count || 0,
        activeJobs: activeJobsResult.count || 0,
        upcomingSchedules: upcomingSchedulesResult.count || 0,
        recentJobs: transformedJobs,
        recentSchedules: transformedSchedules,
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

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : isNewUser ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Your Dashboard!</h2>
          <p className="text-gray-600 mb-8">Get started by adding your first client or creating a new job.</p>
          <div className="flex gap-4">
            <a
              href="/clients/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Client
            </a>
            <a
              href="/jobs/new"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Job
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
      )}
    </DashboardLayout>
  );
}
