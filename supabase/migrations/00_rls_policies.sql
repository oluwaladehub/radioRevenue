-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Jobs policies
-- Admins can do everything
CREATE POLICY "Admins have full access to jobs"
  ON public.jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Hosts can view all jobs and manage their own
CREATE POLICY "Hosts can view all jobs"
  ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'host'
    )
  );

CREATE POLICY "Hosts can manage their own jobs"
  ON public.jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'host'
    )
    AND created_by = auth.uid()
  );

-- Advertisers can only view their own jobs
CREATE POLICY "Advertisers can view their own jobs"
  ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'advertiser'
    )
    AND client = (
      SELECT email FROM public.users
      WHERE users.id = auth.uid()
    )
  );

-- Invoices policies
-- Admins have full access
CREATE POLICY "Admins have full access to invoices"
  ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Hosts can view all invoices and create/update invoices for their jobs
CREATE POLICY "Hosts can view all invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'host'
    )
  );

CREATE POLICY "Hosts can manage invoices for their jobs"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'host'
    )
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_id
      AND jobs.created_by = auth.uid()
    )
  );

-- Advertisers can only view their own invoices
CREATE POLICY "Advertisers can view their own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.jobs j ON j.client = u.email
      WHERE u.id = auth.uid()
      AND u.role = 'advertiser'
      AND j.id = job_id
    )
  );

-- Create functions for real-time features
CREATE OR REPLACE FUNCTION public.handle_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If job is completed, create an invoice automatically
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.invoices (
      job_id,
      amount,
      due_date,
      status
    ) VALUES (
      NEW.id,
      NEW.rate,
      (CURRENT_TIMESTAMP + INTERVAL '30 days'),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job status changes
CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_job_status_change();

-- Function to check for overdue invoices
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
