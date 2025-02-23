import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { id, email, name, role } = await request.json();

    // Create the user profile using the service role key
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id,
          email,
          name,
          role,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in signup route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
