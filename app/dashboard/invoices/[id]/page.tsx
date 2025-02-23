'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { downloadInvoicePDF } from '@/lib/utils/pdfGenerator';

type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'] & {
  job: Database['public']['Tables']['jobs']['Row'];
};

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  client: Database['public']['Tables']['clients']['Row'];
  invoice_items: InvoiceItem[];
};

type InvoiceStatus = 'pending' | 'paid' | 'overdue';

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

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadInvoice();

    // Subscribe to real-time updates
    const channel = supabase.channel('invoice_details_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          loadInvoice();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [params.id]);

  const loadInvoice = async () => {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients (
            *
          ),
          invoice_items (
            *,
            job:jobs (
              *
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setInvoice(invoice as Invoice);
    } catch (error) {
      console.error('Error loading invoice:', error);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
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

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900">Invoice not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The invoice you're looking for doesn't exist or has been deleted
          </p>
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Invoices
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center"
            >
              ← Back to Invoices
            </button>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                statusColors[invoice.status as InvoiceStatus].bg
              } ${statusColors[invoice.status as InvoiceStatus].text}`}
            >
              <span className="mr-1">{statusColors[invoice.status as InvoiceStatus].icon}</span>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Invoice #{invoice.invoice_number}
          </h1>
          <p className="mt-2 text-gray-500">
            Created on {formatDate(invoice.created_at)}
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          {/* Client Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Client Name</h3>
                <p className="mt-1 text-sm text-gray-900">{invoice.client.name}</p>
                <p className="mt-1 text-sm text-gray-500">{invoice.client.contact_person}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact Details</h3>
                <p className="mt-1 text-sm text-gray-900">{invoice.client.email}</p>
                <p className="mt-1 text-sm text-gray-500">{invoice.client.phone}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.invoice_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.job.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Total Amount
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Information */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(invoice.due_date)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={() => downloadInvoicePDF(invoice)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Download PDF
          </button>
          <button
            onClick={() => {/* Add mark as paid functionality */}}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Mark as Paid
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
