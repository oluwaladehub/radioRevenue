import { supabase } from '@/lib/supabase';

export async function updateJobStatus(jobId: string, scheduleId: string, status: 'completed' | 'in_progress') {
  try {
    // Update job status
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (jobError) throw jobError;

    // Update schedule status
    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({
        status: status === 'completed' ? 'completed' : 'live',
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (scheduleError) throw scheduleError;

    return true;
  } catch (error) {
    console.error('Error updating job status:', error);
    throw error;
  }
}
