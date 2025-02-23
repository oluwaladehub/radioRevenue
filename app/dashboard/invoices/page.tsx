'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { downloadInvoicePDF } from '@/lib/utils/pdfGenerator';
import type { Database } from '@/lib/database.types';

type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'] & {
  job: Database['public']['Tables']['jobs']['Row'];
};

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  client: Database['public']['Tables']['clients']['Row'];
  invoice_items: InvoiceItem[];
};

type InvoiceStatus = 'pending' | 'paid' | 'overdue';
type FilterStatus = InvoiceStatus | 'all';

const statusColors: Record<InvoiceStatus, { bg: string; text: string; icon: string }> = {
  'pending': {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: '⏳'
  },
  'paid': {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: '✓'
  },
  'overdue': {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: '⚠'
  },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const router = useRouter();

  useEffect(() => {
    loadInvoices();

    // Subscribe to real-time updates
    const channel = supabase.channel('invoices_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          loadInvoices();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [statusFilter]);

  const loadInvoices = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients (
            *
          ),
          invoice_items:invoice_items (
            *,
            job:jobs (
              *
            )
          )
        `)
        .eq('created_by', user.id);  // Only show invoices created by the current user

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data as Invoice[]);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all your invoices including their status, amount, and client details.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Invoice
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track your invoices
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="rounded-lg border-gray-300 text-gray-700 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="mt-8 text-center text-red-600">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filter to see more invoices.'
                : 'Get started by creating your first invoice.'}
            </p>
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create New Invoice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {invoice.invoice_items?.[0]?.job?.title}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                        statusColors[invoice.status as InvoiceStatus].bg
                      } ${statusColors[invoice.status as InvoiceStatus].text}`}
                    >
                      <span className="mr-1">{statusColors[invoice.status as InvoiceStatus].icon}</span>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        {invoice.client?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.client?.name}</p>
                        <p className="text-sm text-gray-500">{invoice.client?.contact_person}</p>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Due Date */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Due Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(invoice.due_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 pt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => downloadInvoicePDF(invoice)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
