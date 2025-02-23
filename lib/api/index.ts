import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];

// Export all APIs
export { userAPI } from './users';

// Clients API
export const clientsAPI = {
  createClient: async (data: {
    name: string;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    created_by: string;
  }) => {
    const response = await supabase.from('clients').insert([data]).select().single();
    if (response.error) throw response.error;
    return response.data;
  },

  async updateClient(id: string, data: Partial<Tables['clients']['Update']>) {
    const { data: client, error } = await supabase
      .from('clients')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return client;
  },

  async listClients(userId?: string) {
    const query = supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (userId) {
      query.eq('created_by', userId);
    }

    const { data: clients, error } = await query;

    if (error) throw error;
    return clients;
  },

  async getClient(id: string) {
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return client;
  }
};

// Jobs API
export const jobsAPI = {
  async createJob(data: Omit<Tables['jobs']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    // Ensure rate is a number
    const jobData = {
      ...data,
      rate: typeof data.rate === 'string' ? parseFloat(data.rate) : data.rate,
      // Add updated_at
      updated_at: new Date().toISOString(),
    };

    const { data: job, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select(`
        *,
        client:clients (
          name,
          contact_person,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating job:', error);
      throw error;
    }
    return job;
  },

  async updateJob(id: string, data: Partial<Tables['jobs']['Update']>) {
    const { data: job, error } = await supabase
      .from('jobs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return job;
  },

  async listJobs(filters?: { status?: string; search?: string; userId?: string }) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        clients (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.userId) {
      query = query.eq('created_by', filters.userId);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;
    return jobs;
  },

  async getJob(id: string) {
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return job;
  }
};

// Schedules API
export const schedulesAPI = {
  async createSchedule(data: Omit<Tables['schedules']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return schedule;
  },

  async updateSchedule(id: string, data: Partial<Tables['schedules']['Update']>) {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return schedule;
  },

  async listSchedules(date?: string) {
    let query = supabase
      .from('schedules')
      .select(`
        *,
        jobs (
          title,
          clients (
            name
          )
        )
      `)
      .order('scheduled_date')
      .order('start_time');

    if (date) {
      query = query.eq('scheduled_date', date);
    }

    const { data: schedules, error } = await query;

    if (error) throw error;
    return schedules;
  }
};

// Invoices API
export const invoicesAPI = {
  async createInvoice(
    data: Omit<Tables['invoices']['Insert'], 'id' | 'created_at' | 'updated_at'>,
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

  async updateInvoice(id: string, data: Partial<Tables['invoices']['Update']>) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return invoice;
  },

  async listInvoices(filters?: { status?: string }) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name
        ),
        invoice_items (
          *,
          jobs (
            title
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;
    return invoices;
  },

  async getInvoice(id: string) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          email,
          address
        ),
        invoice_items (
          *,
          jobs (
            title,
            duration,
            air_time
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return invoice;
  }
};
