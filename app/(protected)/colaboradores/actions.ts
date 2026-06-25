'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export async function crearColaborador(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('colaboradores').insert({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email')),
    dni: String(formData.get('dni') || ''),
    direccion: String(formData.get('direccion') || ''),
    activo: formData.get('activo') !== 'false',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/colaboradores')
}

export async function editarColaborador(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('colaboradores').update({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email: String(formData.get('email')),
    dni: String(formData.get('dni') || ''),
    direccion: String(formData.get('direccion') || ''),
    activo: formData.get('activo') !== 'false',
  }).eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/colaboradores')
}

export async function borrarColaborador(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('colaboradores').delete().eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/colaboradores')
}
