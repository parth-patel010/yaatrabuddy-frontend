#!/usr/bin/env node
/**
 * Consolidate Supabase migrations into a single neon.sql for Neon PostgreSQL.
 * - Adds public.auth_users table; replaces auth.users references
 * - Replaces auth.uid() with current_setting('app.current_user_id', true)::uuid
 * - Removes trigger on auth.users; removes storage.buckets/objects
 * - Replaces TO authenticated with TO public
 */
import { readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

let sql = `-- Neon PostgreSQL schema (consolidated from Supabase migrations)
-- Run this in Neon SQL Editor. Backend must set: SET LOCAL app.current_user_id = '<user_uuid>';

-- 1. Auth users table (replaces Supabase auth.users for app auth)
CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

for (const f of files) {
  let content = readFileSync(join(migrationsDir, f), 'utf8');

  // Skip storage schema (Neon doesn't have Supabase storage)
  content = content.replace(
    /INSERT INTO storage\.buckets[\s\S]*?ON CONFLICT[^\n]*\n?/g,
    '-- [storage.buckets removed for Neon]\n'
  );
  content = content.replace(
    /CREATE POLICY "[^"]*"\s*ON storage\.objects[\s\S]*?;(?=\s*(?:CREATE|DROP|ALTER|INSERT|--|$))/gm,
    '-- [storage policy removed]\n'
  );
  content = content.replace(/ON storage\.objects[\s\S]*?;(?=\s*(?:CREATE|DROP|ALTER|$))/gm, '-- [storage policy removed]\n');

  // Remove trigger that fires on auth.users (we don't have that table)
  content = content.replace(
    /CREATE TRIGGER on_auth_user_created\s+AFTER INSERT ON auth\.users[\s\S]*?EXECUTE FUNCTION public\.handle_new_user\(\);?\s*/g,
    '-- Trigger on_auth_user_created removed (profile creation done in backend)\n'
  );
  content = content.replace(
    /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?\$\$;/g,
    '-- handle_new_user removed (backend creates profile on signup)\n'
  );

  // References: auth.users -> public.auth_users
  content = content.replace(/REFERENCES auth\.users\(id\)/g, 'REFERENCES public.auth_users(id)');

  // auth.uid() -> current_setting for RLS (no extra parens to avoid ()() )
  content = content.replace(/\bauth\.uid()\b/g, "current_setting('app.current_user_id', true)::uuid");

  // TO authenticated -> TO public (RLS uses USING for actual check)
  content = content.replace(/\bTO authenticated\b/g, 'TO public');

  sql += `\n-- === ${f} ===\n`;
  sql += content;
  sql += '\n';
}

writeFileSync(join(process.cwd(), 'neon.sql'), sql);
console.log('Written neon.sql');
