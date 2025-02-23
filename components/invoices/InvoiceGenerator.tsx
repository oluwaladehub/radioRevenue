'use client';

import { useState, useEffect } from 'react';
import { jobsAPI, invoicesAPI, clientsAPI } from '@/lib/api';
import type { Database } from '@/lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface InvoiceGeneratorProps {
  job: Job;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceGenerator({ job, onSuccess, onCancel }: InvoiceGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    amount: job.rate.toString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: '',
  });

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const clientData = await clientsAPI.getClient(job.client_id);
        setClient(clientData);
      } catch (error) {
        console.error('Error fetching client:', error);
        setError('Failed to load client information');
      }
    };

    fetchClient();
  }, [job.client_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Generate invoice number (you might want to implement a proper numbering system)
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Create the invoice
      await invoicesAPI.createInvoice(
        {
          invoice_number: invoiceNumber,
          client_id: job.client_id,
          total_amount: parseFloat(formData.amount),
          due_date: new Date(formData.dueDate).toISOString(),
          status: 'pending',
          notes: formData.notes || null,
          created_by: job.created_by,
        },
        [
          {
            job_id: job.id,
            description: job.title,
            quantity: 1,
            rate: parseFloat(formData.amount),
            amount: parseFloat(formData.amount)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Job Details</label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-900">{job.title}</p>
            {client && (
              <p className="text-sm text-gray-500">{client.name}</p>
            )}
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
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Generate Invoice
          </button>
        </div>
      </form>
    </div>
  );
}
