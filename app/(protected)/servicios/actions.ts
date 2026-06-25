'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { eurosToCents } from '@/lib/money'

export async function crearServicio(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('servicios').insert({
    nombre: String(formData.get('nombre')),
    precio_cents: eurosToCents(String(formData.get('precio') || '0')),
    duracion_min: Number(formData.get('duracion_min') || 60),
    activo: formData.get('activo') !== 'false',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/servicios')
}

export async function editarServicio(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const id = String(formData.get('id'))
  const { error } = await supabase.from('servicios').update({
    nombre: String(formData.get('nombre')),
    precio_cents: eurosToCents(String(formData.get('precio') || '0')),
    duracion_min: Number(formData.get('duracion_min') || 60),
    activo: formData.get('activo') !== 'false',
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/servicios')
}

export async function borrarServicio(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const { error } = await supabase.from('servicios').delete().eq('id', String(formData.get('id')))
  if (error) throw new Error(error.message)
  revalidatePath('/servicios')
}

