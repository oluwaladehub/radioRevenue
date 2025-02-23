'use client';

import { useState, useEffect } from 'react';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, parseISO } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  client: {
    name: string;
  };
};

type Invoice = Database['public']['Tables']['invoices']['Row'];

interface AnalyticsData {
  totalRevenue: number;
  totalJobs: number;
  completedJobs: number;
  pendingInvoices: number;
  revenueByMonth: { month: string; amount: number }[];
  topClients: { client: string; revenue: number }[];
  jobsByStatus: { status: string; count: number }[];
  averageJobValue: number;
  completionRate: number;
  paymentRate: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('analytics_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'jobs' 
        }, 
        () => loadAnalytics()
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => loadAnalytics()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeframe]);

  const getTimeframeStart = () => {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      case 'year':
        return startOfYear(now);
      default:
        return startOfMonth(now);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let startDate;
      switch (timeframe) {
        case 'week':
          startDate = startOfWeek(new Date());
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          break;
        case 'year':
          startDate = startOfYear(new Date());
          break;
        default:
          startDate = startOfMonth(new Date());
      }

      // Fetch jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          client:clients (
            name
          )
        `)
        .eq('created_by', user.id)  // Only show jobs created by the current user
        .gte('created_at', format(startDate, 'yyyy-MM-dd'));

      if (jobsError) throw jobsError;

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('created_by', user.id)  // Only show invoices created by the current user
        .gte('created_at', format(startDate, 'yyyy-MM-dd'));

      if (invoicesError) throw invoicesError;

      if (!jobs?.length && !invoices?.length) {
        setAnalyticsData({
          totalRevenue: 0,
          totalJobs: 0,
          completedJobs: 0,
          pendingInvoices: 0,
          revenueByMonth: [],
          topClients: [],
          jobsByStatus: [],
          averageJobValue: 0,
          completionRate: 0,
          paymentRate: 0
        });
        return;
      }

      // Calculate analytics data
      const data = calculateAnalytics(jobs as Job[], invoices as Invoice[]);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (jobs: Job[], invoices: Invoice[]): AnalyticsData => {
    // Calculate total revenue
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    // Count jobs by status
    const jobsByStatus = Object.entries(
      jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));

    // Calculate revenue by month
    const revenueByMonth = Object.entries(
      invoices.reduce((acc, inv) => {
        const month = format(parseISO(inv.created_at), 'MMMM yyyy');
        acc[month] = (acc[month] || 0) + inv.total_amount;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(' ');
        const [monthB, yearB] = b.month.split(' ');
        return new Date(`${monthB} 1, ${yearB}`).getTime() - new Date(`${monthA} 1, ${yearA}`).getTime();
      });

    // Calculate top clients
    const topClients = Object.entries(
      jobs.reduce((acc, job) => {
        const clientName = job.client?.name || 'Unknown Client';
        acc[clientName] = (acc[clientName] || 0) + job.rate;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([client, revenue]) => ({ client, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate additional metrics
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const completionRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const paymentRate = invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 0;
    
    const averageJobValue = jobs.length > 0 ? jobs.reduce((sum, job) => sum + job.rate, 0) / jobs.length : 0;

    return {
      totalRevenue,
      totalJobs: jobs.length,
      completedJobs,
      pendingInvoices: invoices.filter(inv => inv.status === 'pending').length,
      revenueByMonth,
      topClients,
      jobsByStatus,
      averageJobValue,
      completionRate,
      paymentRate,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="mt-2 text-sm text-gray-700">
              Overview of your radio business performance and insights.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="mt-8 text-center text-red-600">{error}</div>
        ) : !analyticsData || (!analyticsData.totalJobs && !analyticsData.totalRevenue) ? (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No analytics data available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start creating jobs and invoices to see your business analytics.
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/jobs/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Job
              </button>
              <button
                onClick={() => router.push('/dashboard/invoices/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {analyticsData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {formatCurrency(analyticsData.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Average Job Value</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {formatCurrency(analyticsData.averageJobValue)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {formatPercentage(analyticsData.completionRate)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {analyticsData.completedJobs} of {analyticsData.totalJobs} jobs
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Payment Rate</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {formatPercentage(analyticsData.paymentRate)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {analyticsData.pendingInvoices} pending invoices
                    </p>
                  </div>
                </div>

                {/* Charts and Tables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Revenue by Month */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Month</h3>
                    <div className="space-y-4">
                      {analyticsData.revenueByMonth.map(({ month, amount }) => (
                        <div key={month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{month}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Clients */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Clients</h3>
                    <div className="space-y-4">
                      {analyticsData.topClients.map(({ client, revenue }) => (
                        <div key={client} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{client}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Jobs by Status */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Jobs by Status</h3>
                    <div className="space-y-4">
                      {analyticsData.jobsByStatus.map(({ status, count }) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
