'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export async function crearSupervisor(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('supervisores').insert({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email')),
    activo: formData.get('activo') !== 'false',
  })
  if (error) throw new Error(error.message)
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
  const { error } = await supabase.from('supervisores').delete().eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/supervisores')
}
