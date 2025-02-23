'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'react-hot-toast';
import type { Database } from '@/lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  client: Database['public']['Tables']['clients']['Row'];
};

type InvoiceFormData = {
  job_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
};

const defaultFormData: InvoiceFormData = {
  job_id: '',
  invoice_number: '',
  amount: 0,
  due_date: '',
  status: 'pending',
  description: '',
};

export default function NewInvoicePage() {
  const [formData, setFormData] = useState<InvoiceFormData>(defaultFormData);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const loadJobs = async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:clients (
            *
          )
        `)
        .eq('status', 'completed');

      if (error) throw error;
      setJobs(jobs as Job[]);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    }
  };

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    loadJobs();
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleJobSelect = (jobId: string) => {
    const selectedJob = jobs.find(job => job.id === jobId);
    if (selectedJob) {
      setFormData(prev => ({
        ...prev,
        job_id: jobId,
        invoice_number: generateInvoiceNumber(),
        amount: selectedJob.rate || 0,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create an invoice');
      router.push('/login');
      return;
    }

    setLoading(true);
    const toastId = 'invoice-submit';
    
    try {
      toast.loading('Creating invoice...', { id: toastId });

      const selectedJob = jobs.find(job => job.id === formData.job_id);
      if (!selectedJob) throw new Error('Job not found');

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: formData.invoice_number,
          client_id: selectedJob.client_id,
          total_amount: formData.amount,
          status: formData.status,
          due_date: formData.due_date,
          notes: formData.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          job_id: selectedJob.id,
          description: selectedJob.title,
          quantity: 1,
          rate: formData.amount,
          amount: formData.amount,
          created_by: user.id,
        });

      if (itemError) throw itemError;

      toast.success('Invoice created successfully!', { id: toastId });
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Create New Invoice
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Generate an invoice for a completed job
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job Selection Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Job Details</h3>
            <div className="space-y-6">
              {/* Job Selection */}
              <div>
                <label htmlFor="job_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Job
                </label>
                <select
                  id="job_id"
                  value={formData.job_id}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  required
                >
                  <option value="">Select a completed job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  id="invoice_number"
                  value={formData.invoice_number}
                  readOnly
                  className="block w-full px-4 py-3 rounded-lg bg-gray-50 border-gray-300 text-gray-500 shadow-sm text-base"
                />
                <p className="mt-1 text-sm text-gray-500">Auto-generated invoice number</p>
              </div>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-base">₦</span>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                    className="block w-full pl-8 pr-4 py-3 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Additional Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Additional Information</h3>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description or Notes
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="block w-full px-4 py-3 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Add payment instructions or additional notes..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
