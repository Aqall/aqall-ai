-- Migration: Add Build Locking to Projects Table
-- Run this in your Supabase SQL Editor

-- Add build_status column (defaults to NULL which we treat as 'idle')
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS build_status TEXT CHECK (build_status IN ('idle', 'processing'));

-- Add locked_by column (tracks which user locked the project)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add locked_at column (tracks when the project was locked)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups on build_status
CREATE INDEX IF NOT EXISTS projects_build_status_idx ON public.projects(build_status);

-- Set default value for existing projects (NULL = idle)
UPDATE public.projects
SET build_status = 'idle'
WHERE build_status IS NULL;



