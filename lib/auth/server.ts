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
    if (role === 'supervisor') profile.supervisor_id = row.id

    return profile
  }

  return (await search('supervisores', 'supervisor')) || (await search('colaboradores', 'colaborador'))
}

async function isRoleEntityActive(admin: ReturnType<typeof createAdminClient>, profile: any, userEmail?: string) {
  const role = String(profile?.role || '')
  const normalizedEmail = String(userEmail || profile?.email || '').trim().toLowerCase()

  if (role === 'colaborador') {
    let query = admin.from('colaboradores').select('id').eq('activo', true).limit(1)
    const colaboradorId = String(profile?.colaborador_id || '').trim()
    query = colaboradorId ? query.eq('id', colaboradorId) : query.ilike('email', normalizedEmail)
    const { data, error } = await query
    return !error && Boolean(data?.[0])
  }

  if (role === 'supervisor') {
    let query = admin.from('supervisores').select('id').eq('activo', true).limit(1)
    const supervisorId = String(profile?.supervisor_id || '').trim()
    query = supervisorId ? query.eq('id', supervisorId) : query.ilike('email', normalizedEmail)
    const { data, error } = await query
    return !error && Boolean(data?.[0])
  }

  return true
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const currentProfile: any = profile
  if (error) return null

  if (currentProfile) {
    const normalizedEmail = String(user.email || currentProfile.email || '').trim().toLowerCase()

    // Si el perfil base sigue activo, pero la entidad de negocio ya no lo está, lo desactivamos.
    if (currentProfile.activo) {
      const stillActive = await isRoleEntityActive(admin, currentProfile, user.email || undefined)
      if (!stillActive) {
        await admin.from('profiles').update({ activo: false }).eq('id', user.id)
      } else {
        return currentProfile
      }
    }

    // Si el perfil actual quedó desactivado, intentamos re-vincular la sesión al perfil activo
    // que corresponda a este email (por ejemplo, un supervisor creado después de desactivar
    // un colaborador que usaba el mismo correo).
    if (normalizedEmail) {
      const relatedProfile = await findRelatedProfile(admin, normalizedEmail)
      if (relatedProfile) {
        const { data: created, error: createError } = await admin
          .from('profiles')
          .upsert({ ...relatedProfile, id: user.id }, { onConflict: 'id' })
          .select('*')
          .single()

        if (!createError && (created || relatedProfile)) {
          return created || relatedProfile
        }
      }
    }

    return null
  }

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
