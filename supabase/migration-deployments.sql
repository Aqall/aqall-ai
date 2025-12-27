-- Phase 9: Netlify Deployment Integration
-- Creates deployments table to track Netlify deployments

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'ready', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS deployments_project_id_idx ON public.deployments(project_id);
CREATE INDEX IF NOT EXISTS deployments_build_id_idx ON public.deployments(build_id);
CREATE INDEX IF NOT EXISTS deployments_status_idx ON public.deployments(status);
CREATE INDEX IF NOT EXISTS deployments_netlify_site_id_idx ON public.deployments(netlify_site_id);

-- Enable RLS
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own deployments (through project ownership)
CREATE POLICY "Users can view own deployments"
  ON public.deployments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create deployments for their own projects
CREATE POLICY "Users can create own deployments"
  ON public.deployments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update their own deployments
CREATE POLICY "Users can update own deployments"
  ON public.deployments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION update_deployments_updated_at();
