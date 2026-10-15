import 'server-only';
import { redirect } from 'next/navigation';
import { createClient, isConfigured } from './supabase/server';

export async function adminSession() {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('id,display_name')
    .eq('id', user.id)
    .maybeSingle();
  return profile ? { supabase, user, profile } : null;
}
export async function requireAdmin() {
  const session = await adminSession();
  if (!session) redirect('/admin/login');
  return session;
}
