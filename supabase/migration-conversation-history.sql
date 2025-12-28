-- Migration: Conversation History Table
-- Stores conversation messages for project context/memory

-- Create messages table to store conversation history
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  build_version INTEGER REFERENCES public.builds(version) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for faster queries
  INDEX idx_messages_project_created (project_id, created_at)
);

-- Create index for faster queries by project
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access messages for their own projects
CREATE POLICY "Users can view messages for their own projects"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their own projects"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages for their own projects"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Optional: Add a function to get recent messages with limit
CREATE OR REPLACE FUNCTION public.get_recent_messages(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  role TEXT,
  content TEXT,
  build_version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.project_id,
    m.role,
    m.content,
    m.build_version,
    m.created_at
  FROM public.messages m
  WHERE m.project_id = p_project_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

