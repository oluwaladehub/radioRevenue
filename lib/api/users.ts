import { supabase } from '../supabase';
import type { Database } from '../database.types';

type User = Database['public']['Tables']['users']['Row'];

export const userAPI = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return data;
  },

  async updateUser(id: string, data: Partial<User>) {
    const { data: user, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  },

  async listUsers() {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) throw error;
    return users;
  },

  async getUser(id: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return user;
  }
};
