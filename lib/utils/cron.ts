import { format, parseISO } from 'date-fns';

export async function updateJobStatuses() {
  try {
    const response = await fetch('/api/cron/update-job-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to update job statuses');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating job statuses:', error);
    throw error;
  }
}
