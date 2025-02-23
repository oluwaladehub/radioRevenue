import { supabase } from './supabase';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

export const realtimeSubscriptions = {
  jobs: {
    subscribe(callback: (payload: {
      new: Tables['jobs']['Row'];
      old: Tables['jobs']['Row'];
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    }) => void) {
      return supabase
        .channel('jobs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
          },
          (payload) => {
            callback({
              new: payload.new as Tables['jobs']['Row'],
              old: payload.old as Tables['jobs']['Row'],
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            });
          }
        )
        .subscribe();
    },
  },

  invoices: {
    subscribe(callback: (payload: {
      new: Tables['invoices']['Row'];
      old: Tables['invoices']['Row'];
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    }) => void) {
      return supabase
        .channel('invoices_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
          },
          (payload) => {
            callback({
              new: payload.new as Tables['invoices']['Row'],
              old: payload.old as Tables['invoices']['Row'],
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            });
          }
        )
        .subscribe();
    },
  },
};
