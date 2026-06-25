'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export async function crearPaciente(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase = await createClient()

  const colaboradorIds = formData.getAll('colaborador_ids').map(String).filter(Boolean)
  const supervisorId = String(formData.get('supervisor_id') || '').trim()

  const { data: paciente, error } = await supabase.from('pacientes').insert({
    codigo: String(formData.get('codigo')),
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email') || ''),
    dni: String(formData.get('dni') || ''),
    activo: formData.get('activo') !== 'false',
  } as any).select('id').single()
  if (error) throw new Error(error.message)

  // Insert asignaciones colaborador-paciente
  if (paciente && colaboradorIds.length > 0) {
    const rows = colaboradorIds.map(cid => ({ paciente_id: paciente.id, colaborador_id: cid }))
    await supabase.from('paciente_colaborador').insert(rows as any)
  }

  // Insert asignación supervisor-paciente
  if (paciente && supervisorId) {
    await supabase.from('paciente_supervisor').insert({ paciente_id: paciente.id, supervisor_id: supervisorId } as any)
  }

  revalidatePath('/pacientes')
}

export async function editarPaciente(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase = await createClient()
  const id = String(formData.get('id'))
  const colaboradorIds = formData.getAll('colaborador_ids').map(String).filter(Boolean)
  const supervisorId = String(formData.get('supervisor_id') || '').trim()

  const { error } = await supabase.from('pacientes').update({
    codigo: String(formData.get('codigo')),
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email') || ''),
    dni: String(formData.get('dni') || ''),
    activo: formData.get('activo') !== 'false',
  } as any).eq('id', id)
  if (error) throw new Error(error.message)

  // Update asignaciones colaborador
  await supabase.from('paciente_colaborador').delete().eq('paciente_id', id)
  if (colaboradorIds.length > 0) {
    const rows = colaboradorIds.map(cid => ({ paciente_id: id, colaborador_id: cid }))
    await supabase.from('paciente_colaborador').insert(rows as any)
  }

  // Update asignación supervisor
  await supabase.from('paciente_supervisor').delete().eq('paciente_id', id)
  if (supervisorId) {
    await supabase.from('paciente_supervisor').insert({ paciente_id: id, supervisor_id: supervisorId } as any)
  }

  revalidatePath('/pacientes')
}

export async function borrarPaciente(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase = await createClient()
  const { error } = await supabase.from('pacientes').delete().eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
}
