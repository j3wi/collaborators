'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { sendPasswordSetupEmail } from '@/lib/auth/password-access'

export type ReenviarAccesoState = {
  ok: boolean
  message: string
} | null

export async function crearColaborador(formData: FormData) {
  const profile = await requireProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
  const supabase: any = await createClient()
  const email = String(formData.get('email'))
  const { error } = await supabase.from('colaboradores').insert({
    nombre: String(formData.get('nombre')),
    apellidos: String(formData.get('apellidos') || ''),
    email,
    dni: String(formData.get('dni') || ''),
    direccion: String(formData.get('direccion') || ''),
    activo: formData.get('activo') !== 'false',
  })
  if (error) throw new Error(error.message)
  if (email) await sendPasswordSetupEmail(email)
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
  const colaboradorId = String(formData.get('id'))

  // Soft delete: marcar como inactivo en lugar de borrar
  const { error } = await supabase.from('colaboradores').update({
    activo: false,
  }).eq('id', colaboradorId)
  if (error) throw new Error(error.message)
  revalidatePath('/colaboradores')
}

export async function reenviarAccesoColaborador(_prevState: ReenviarAccesoState, formData: FormData): Promise<ReenviarAccesoState> {
  try {
    const profile = await requireProfile()
    if (profile.role !== 'admin' && profile.role !== 'supervisor') throw new Error('Sin permiso')
    const supabase: any = await createClient()
    const id = String(formData.get('id') || '')
    const { data: colaborador, error } = await supabase.from('colaboradores').select('email').eq('id', id).single()
    if (error) throw new Error(error.message)
    if (!colaborador?.email) throw new Error('El colaborador no tiene email')
    await sendPasswordSetupEmail(String(colaborador.email))
    revalidatePath('/colaboradores')
    return { ok: true, message: 'Acceso enviado correctamente' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo enviar el acceso',
    }
  }
}
