import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Determine __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse .env file without external dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://qbozhivwwwgaolcsihan.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib3poaXZ3d3dnYW9sY3NpaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTgxNzIsImV4cCI6MjEwNTM3NDE3Mn0._PeURRGfoJeewT0aUcQAKkauYHKDfl6AA4P_Vuojj3g';

const defaultAdminEmail =
  process.env.ADMIN_EMAIL ||
  process.env.VITE_ADMIN_EMAIL ||
  process.env.EXPO_PUBLIC_ADMIN_EMAIL ||
  'dhushyandhneduncheziyan4896@gmail.com';

export async function makeAdmin(targetEmail: string = defaultAdminEmail) {
  console.log('====================================================');
  console.log('            RenewX Crew - Make Admin                ');
  console.log('====================================================');
  console.log(`Target Admin Email: ${targetEmail}`);
  console.log(`Supabase URL:       ${supabaseUrl}`);

  const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`Using Key:          ${isServiceRole ? 'Service Role Key (Full Access)' : 'Anon Public Key'}`);
  console.log('----------------------------------------------------');

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // 1. Check if profile exists for target email
    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .eq('email', targetEmail)
      .maybeSingle();

    if (profileErr) {
      console.warn(`Note when querying profiles: ${profileErr.message}`);
    }

    if (profile) {
      console.log(`Found existing profile for "${targetEmail}":`);
      console.log(`  User ID: ${profile.id}`);
      console.log(`  Current Role: ${profile.role}`);

      if (profile.role === 'admin') {
        console.log(`✓ User "${targetEmail}" is ALREADY an admin in profiles table!`);
        return;
      }

      // Try to update profile
      const { error: updateErr } = await client
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id);

      if (!updateErr) {
        console.log(`✓ Successfully updated "${targetEmail}" role to "admin"!`);
        return;
      } else {
        console.warn(`Could not update directly via API: ${updateErr.message}`);
      }
    } else {
      console.log(`No profile row found yet for "${targetEmail}".`);
      console.log(`(If the user hasn't signed up yet, sign up in the app first or run the SQL below)`);
    }

    // If RLS blocked anon key update or profile not found, output exact SQL command
    console.log('\n----------------------------------------------------');
    console.log('To ensure this user has admin rights, execute this SQL in your');
    console.log('Supabase SQL Editor (Dashboard -> SQL Editor -> New query):');
    console.log('----------------------------------------------------');
    console.log(`
-- 1. If user has already signed up:
UPDATE public.profiles
SET role = 'admin'
WHERE email = '${targetEmail}';

-- 2. If you want this email to always be admin upon future sign-up:
CREATE OR REPLACE FUNCTION public.handle_new_user_with_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = '${targetEmail}' THEN 'admin' ELSE 'customer' END
  )
  ON CONFLICT (id) DO UPDATE
  SET role = CASE WHEN EXCLUDED.email = '${targetEmail}' THEN 'admin' ELSE profiles.role END;

  RETURN NEW;
END;
$$;
`);
    console.log('----------------------------------------------------\n');
  } catch (err: any) {
    console.error('Unexpected error during makeAdmin:', err?.message || err);
  }
}

// Execute if run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cliEmail = process.argv[2] || defaultAdminEmail;
  makeAdmin(cliEmail);
}
