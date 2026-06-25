import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !profile.activo) return null
  return profile
}
export async function requireProfile() { const p = await getCurrentProfile(); if (!p) redirect('/login'); return p }
export function canManageLiquidaciones(profile: { role: string }) { return profile.role === 'admin' || profile.role === 'supervisor' }
