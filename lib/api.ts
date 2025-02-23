import { supabase } from './supabase';
import { Database } from './database.types';

type Tables = Database['public']['Tables'];

// User API
export const userAPI = {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return data;
  },

  async updateUser(id: string, updates: Partial<Tables['users']['Update']>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Jobs API
export const jobsAPI = {
  async createJob(jobData: Omit<Tables['jobs']['Insert'], 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateJob(id: string, updates: Partial<Tables['jobs']['Update']>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteJob(id: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getJob(id: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async listJobs(filters?: {
    status?: Tables['jobs']['Row']['status'];
    client?: string;
    search?: string;
  }) {
    let query = supabase.from('jobs').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.client) {
      query = query.eq('client', filters.client);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,client.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// Invoices API
export const invoicesAPI = {
  async createInvoice(
    data: Omit<Tables['invoices']['Insert'], 'id' | 'created_at'>,
    items: Omit<Tables['invoice_items']['Insert'], 'id' | 'created_at' | 'invoice_id'>[]
  ) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        ...data,
        created_by: data.created_by
      })
      .select()
      .single();

    if (error) throw error;

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        items.map(item => ({ 
          ...item, 
          invoice_id: invoice.id,
          created_by: data.created_by
        }))
      );

    if (itemsError) throw itemsError;

    return invoice;
  },

  async updateInvoice(id: string, updates: Partial<Tables['invoices']['Update']>) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getInvoice(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, jobs(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async listInvoices(filters?: {
    status?: Tables['invoices']['Row']['status'];
    jobId?: string;
  }) {
    let query = supabase.from('invoices').select('*, jobs(*)');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.jobId) {
      query = query.eq('job_id', filters.jobId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// Re-export everything from the index file
export * from './api/index';
