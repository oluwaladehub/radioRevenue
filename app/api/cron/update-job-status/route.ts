import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format, isBefore, parseISO } from 'date-fns';
import type { Database } from '@/lib/database.types';

type Schedule = Database['public']['Tables']['schedules']['Row'] & {
  job: {
    id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  };
};

export async function GET() {
  try {
    // Get all schedules that are not cancelled and their jobs
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select(`
        *,
        job:jobs (
          id,
          status
        )
      `)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true });

    if (schedulesError) throw schedulesError;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm:ss');

    // Group schedules by job_id to find the latest schedule for each job
    const jobSchedules = (schedules as Schedule[] || []).reduce<Record<string, Schedule[]>>((acc, schedule) => {
      if (!acc[schedule.job_id]) {
        acc[schedule.job_id] = [];
      }
      acc[schedule.job_id].push(schedule);
      return acc;
    }, {});

    // Update job statuses based on their schedules
    for (const [jobId, jobScheduleList] of Object.entries(jobSchedules)) {
      if (!jobScheduleList || !jobScheduleList.length) continue;

      const sortedSchedules = [...jobScheduleList].sort((a: Schedule, b: Schedule) => 
        parseISO(b.scheduled_date + 'T' + b.end_time).getTime() - 
        parseISO(a.scheduled_date + 'T' + a.end_time).getTime()
      );

      const latestSchedule = sortedSchedules[0];
      if (!latestSchedule || !latestSchedule.job) continue;

      const scheduleEndTime = parseISO(latestSchedule.scheduled_date + 'T' + latestSchedule.end_time);
      
      // If the latest schedule's end time has passed, mark the job as completed
      if (isBefore(scheduleEndTime, now) && latestSchedule.job.status !== 'completed') {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (updateError) {
          console.error('Error updating job status:', updateError);
          continue;
        }

        // Update the schedule status to completed as well
        const { error: scheduleUpdateError } = await supabase
          .from('schedules')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', latestSchedule.id);

        if (scheduleUpdateError) {
          console.error('Error updating schedule status:', scheduleUpdateError);
        }
      }
      
      // If the schedule is currently running, mark the job as in_progress
      else if (
        latestSchedule.scheduled_date === today &&
        latestSchedule.start_time <= currentTime &&
        latestSchedule.end_time > currentTime &&
        latestSchedule.job.status !== 'in_progress'
      ) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (updateError) {
          console.error('Error updating job status:', updateError);
          continue;
        }

        // Update the schedule status to live
        const { error: scheduleUpdateError } = await supabase
          .from('schedules')
          .update({ 
            status: 'live',
            updated_at: new Date().toISOString()
          })
          .eq('id', latestSchedule.id);

        if (scheduleUpdateError) {
          console.error('Error updating schedule status:', scheduleUpdateError);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Job statuses updated successfully'
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update job statuses'
    }, { status: 500 });
  }
}
