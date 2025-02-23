'use client';

import { useState } from 'react';
import { jobsAPI, invoicesAPI } from '@/lib/api';
import type { Database } from '@/lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

interface InvoiceGeneratorProps {
  job: Job;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceGenerator({ job, onSuccess, onCancel }: InvoiceGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: job.rate.toString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await invoicesAPI.createInvoice(
        {
          job_id: job.id,
          amount: parseFloat(formData.amount),
          due_date: new Date(formData.dueDate).toISOString(),
          status: 'pending',
          created_by: job.created_by,
        },
        [
          {
            job_id: job.id,
            amount: parseFloat(formData.amount),
            created_by: job.created_by,
          }
        ]
      );

      onSuccess();
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError('Failed to generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Generate Invoice</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Job Details</label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-900">{job.title}</p>
            <p className="text-sm text-gray-500">{job.client}</p>
            <p className="text-sm text-gray-500">Duration: {job.duration}</p>
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (₦)
          </label>
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            type="date"
            id="dueDate"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
