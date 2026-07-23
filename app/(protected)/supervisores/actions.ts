'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { sendPasswordSetupEmail } from '@/lib/auth/password-access'

export async function crearSupervisor(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const email = String(formData.get('email'))
  const { error } = await supabase.from('supervisores').insert({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email,
    activo: formData.get('activo') !== 'false',
  })
  if (error) throw new Error(error.message)
  if (email) await sendPasswordSetupEmail(email)
  revalidatePath('/supervisores')
}

export async function editarSupervisor(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('supervisores').update({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email')),
    activo: formData.get('activo') !== 'false',
  }).eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/supervisores')
}

export async function borrarSupervisor(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const supervisorId = String(formData.get('id'))
  
  // Soft delete: marcar como inactivo en lugar de borrar
  const { error } = await supabase.from('supervisores').update({
    activo: false,
  }).eq('id', supervisorId)
  if (error) throw new Error(error.message)
  revalidatePath('/supervisores')
}

export async function reenviarAccesoSupervisor(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const id = String(formData.get('id') || '')
  const { data: supervisor, error } = await supabase.from('supervisores').select('email').eq('id', id).single()
  if (error) throw new Error(error.message)
  if (!supervisor?.email) throw new Error('El supervisor no tiene email')
  await sendPasswordSetupEmail(String(supervisor.email))
  revalidatePath('/supervisores')
}
