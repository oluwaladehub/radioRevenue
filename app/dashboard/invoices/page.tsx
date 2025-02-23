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
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients (
            name,
            contact_person,
            email
          ),
          invoice_items (
            job:jobs (
              title
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as InvoiceStatus);
      }

      const { data: invoices, error } = await query;

      if (error) throw error;
      setInvoices(invoices as Invoice[]);
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
        {/* Header */}
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
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <span className="mr-2">+</span>
              New Invoice
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Invoices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Empty State */}
        {invoices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first invoice
            </p>
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Invoice
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
