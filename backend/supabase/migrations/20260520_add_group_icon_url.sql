-- Run in Supabase SQL editor if groups already exists without icon_url
ALTER TABLE groups ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Storage bucket for group icons (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-icons', 'group-icons', true)
ON CONFLICT (id) DO NOTHING;
