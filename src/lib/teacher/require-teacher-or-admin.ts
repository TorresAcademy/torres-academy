import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireTeacherOrAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/teacher')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/dashboard')
  }

  if (profile.role !== 'teacher' && profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return { supabase, user, profile }
}