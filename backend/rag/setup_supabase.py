"""
Supabase Setup Instructions for Submit and Heal RAG

To enable RAG memory (Retrieval Augmented Generation), you need to create a Supabase
project and run the following SQL script in your Supabase SQL Editor.

1. Go to https://supabase.com/ and create a new project.
2. Navigate to the SQL Editor in your Supabase dashboard.
3. Paste and run the SQL script below.
4. Go to Project Settings -> API and copy your Project URL and anon key.
5. Add them to your `backend/.env` file as SUPABASE_URL and SUPABASE_KEY.
"""

SQL_SCRIPT = """
-- Enable pgvector extension
create extension if not exists vector;

-- Create incidents table
create table incidents (
  id uuid default gen_random_uuid() primary key,
  repo_url text,
  error_description text,
  detected_stack text,
  error_category text,
  root_cause text,
  why_it_happened text,
  fix_summary text,
  affected_files text[],
  confidence_percentage int,
  verified boolean default false,
  created_at timestamp default now(),
  embedding vector(384)
);

-- Disable Row Level Security to allow inserts from anon key (or create appropriate policies)
alter table incidents disable row level security;

-- Create index for fast similarity search
create index on incidents 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create match_incidents RPC function for similarity search
create or replace function match_incidents(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  only_verified boolean
)
returns table (
  id uuid,
  error_description text,
  detected_stack text,
  error_category text,
  root_cause text,
  why_it_happened text,
  fix_summary text,
  affected_files text[],
  confidence_percentage int,
  similarity float
)
language sql stable
as $$
  select
    id,
    error_description,
    detected_stack,
    error_category,
    root_cause,
    why_it_happened,
    fix_summary,
    affected_files,
    confidence_percentage,
    1 - (incidents.embedding <=> query_embedding) as similarity
  from incidents
  where 
    (not only_verified or verified = true)
    and 1 - (incidents.embedding <=> query_embedding) > match_threshold
  order by incidents.embedding <=> query_embedding
  limit match_count;
$$;
"""

if __name__ == "__main__":
    print(SQL_SCRIPT)
