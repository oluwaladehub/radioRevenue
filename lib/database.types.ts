export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'host' | 'advertiser'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'admin' | 'host' | 'advertiser'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'host' | 'advertiser'
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          client_id: string
          duration: string
          air_time: string
          rate: number
          repeat_days: string[]
          description: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          client_id: string
          duration: string
          air_time: string
          rate: number
          repeat_days: string[]
          description?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          created_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          client_id?: string
          duration?: string
          air_time?: string
          rate?: number
          repeat_days?: string[]
          description?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          created_by?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          job_id: string
          scheduled_date: string
          start_time: string
          end_time: string
          status: 'upcoming' | 'live' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          scheduled_date: string
          start_time: string
          end_time: string
          status?: 'upcoming' | 'live' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          scheduled_date?: string
          start_time?: string
          end_time?: string
          status?: 'upcoming' | 'live' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          client_id: string
          total_amount: number
          status: 'pending' | 'paid' | 'overdue'
          due_date: string
          paid_date: string | null
          notes: string | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          client_id: string
          total_amount: number
          status?: 'pending' | 'paid' | 'overdue'
          due_date: string
          paid_date?: string | null
          notes?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          client_id?: string
          total_amount?: number
          status?: 'pending' | 'paid' | 'overdue'
          due_date?: string
          paid_date?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          job_id: string
          description: string
          quantity: number
          rate: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          job_id: string
          description: string
          quantity: number
          rate: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          job_id?: string
          description?: string
          quantity?: number
          rate?: number
          amount?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
