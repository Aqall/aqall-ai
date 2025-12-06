-- Aqall Database Schema
-- TODO: Run this SQL in Supabase SQL Editor when connecting to real backend

-- ============================================
-- PROFILES TABLE
-- Stores user profile information
-- ============================================
/*
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

-- ============================================
-- PROJECTS TABLE
-- Stores user projects/websites
-- ============================================
/*
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX projects_user_id_idx ON public.projects(user_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);
*/

-- ============================================
-- BUILDS TABLE
-- Stores generated website versions
-- ============================================
/*
CREATE TABLE public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, version)
);

-- Indexes
CREATE INDEX builds_project_id_idx ON public.builds(project_id);
CREATE INDEX builds_project_version_idx ON public.builds(project_id, version);

-- Enable RLS
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- Policies (through project ownership)
CREATE POLICY "Users can view builds of own projects" 
  ON public.builds FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create builds for own projects" 
  ON public.builds FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete builds of own projects" 
  ON public.builds FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );
*/

-- ============================================
-- STORAGE BUCKETS (for generated assets)
-- ============================================
/*
-- Create bucket for project assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', false);

-- RLS policies for storage
CREATE POLICY "Users can upload to own project folders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets' AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id::text = (storage.foldername(name))[1]
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own project assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-assets' AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id::text = (storage.foldername(name))[1]
      AND projects.user_id = auth.uid()
    )
  );
*/

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
/*
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/
