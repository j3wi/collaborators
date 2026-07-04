import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function findRelatedProfile(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  const search = async (table: 'supervisores' | 'colaboradores', role: 'supervisor' | 'colaborador') => {
    const { data, error } = await admin
      .from(table)
      .select('id,nombre,apellidos,email,activo')
      .ilike('email', normalizedEmail)
      .eq('activo', true)
      .limit(1)

    if (error) return null

    const row = data?.[0]
    if (!row) return null

    const profile: Record<string, any> = {
      id: '',
      email: row.email || normalizedEmail,
      nombre: row.nombre || '',
      apellidos: row.apellidos || '',
      role,
      activo: true,
    }

    if (role === 'colaborador') profile.colaborador_id = row.id

    return profile
  }

  return (await search('supervisores', 'supervisor')) || (await search('colaboradores', 'colaborador'))
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const currentProfile: any = profile
  if (error) return null
  if (currentProfile) return !currentProfile.activo ? null : currentProfile

  if (!user.email) return null

  const relatedProfile = await findRelatedProfile(admin, user.email)
  if (!relatedProfile) return null

  const { data: created, error: createError } = await admin
    .from('profiles')
    .upsert({ ...relatedProfile, id: user.id }, { onConflict: 'id' })
    .select('*')
    .single()

  if (createError) return null
  return created || relatedProfile
}

export async function requireProfile() {
  const p = await getCurrentProfile()
  if (!p) redirect('/login')
  return p
}
export function canManageLiquidaciones(profile: { role: string }) { return profile.role === 'admin' || profile.role === 'supervisor' }
