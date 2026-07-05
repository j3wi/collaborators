'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { eurosToCents } from '@/lib/money'

export async function crearCita(formData: FormData) {
  const profile = await requireProfile()
  const supabase: any = await createClient()
  const pacienteIds = formData.getAll('paciente_ids').map(String).filter(Boolean)

  const { data: cita, error } = await supabase
    .from('citas')
    .insert({
      fecha: String(formData.get('fecha')),
      hora_inicio: String(formData.get('hora_inicio')),
      hora_fin: String(formData.get('hora_fin')),
      servicio_id: String(formData.get('servicio_id') || '') || null,
      colaborador_id: String(formData.get('colaborador_id')),
      supervisor_id: String(formData.get('supervisor_id') || '') || null,
      precio_cents: eurosToCents(String(formData.get('precio') || '0')),
      estado: 'programada',
      pago_estado: 'pendiente',
      reminder_enabled: formData.get('reminder_enabled') === 'on',
      reminder_days_before: Number(formData.get('reminder_days_before') || 5),
      created_by: profile.id,
    } as any)
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (cita && pacienteIds.length > 0) {
    const rows = pacienteIds.map((pid) => ({ cita_id: (cita as any).id, paciente_id: pid }))
    await supabase.from('cita_pacientes').insert(rows as any)
  }

  if (cita) {
    const observaciones = String(formData.get('notas') || '').trim()
    if (observaciones) {
      const { error: notasError } = await supabase.from('cita_notas').upsert({
        cita_id: (cita as any).id,
        observaciones_clinicas: observaciones,
        last_edited_by: profile.id,
        last_edited_at: new Date().toISOString(),
      } as any)
      if (notasError) throw new Error(notasError.message)
    }
  }
  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

export async function editarCita(formData: FormData) {
  const profile = await requireProfile()
  const supabase: any = await createClient()
  const citaId = String(formData.get('cita_id') || '')
  if (!citaId) throw new Error('Cita no válida')

  // Validar que la cita no esté en una liquidación pagada
  const { data: cita, error: citaError } = await supabase
    .from('citas')
    .select('liquidacion_id,estado')
    .eq('id', citaId)
    .single()
  if (citaError) throw new Error(citaError.message)

  if (cita?.liquidacion_id) {
    const { data: liquidacion } = await supabase
      .from('liquidaciones')
      .select('estado')
      .eq('id', cita.liquidacion_id)
      .single()
    if (liquidacion?.estado === 'pagada') throw new Error('No puedes editar una cita en una liquidación pagada')
  }

  const pacienteIds = formData.getAll('paciente_ids').map(String).filter(Boolean)

  const { error: updateError } = await supabase
    .from('citas')
    .update({
      fecha: String(formData.get('fecha')),
      hora_inicio: String(formData.get('hora_inicio')),
      hora_fin: String(formData.get('hora_fin')),
      servicio_id: String(formData.get('servicio_id') || '') || null,
      colaborador_id: String(formData.get('colaborador_id')),
      supervisor_id: String(formData.get('supervisor_id') || '') || null,
      precio_cents: eurosToCents(String(formData.get('precio') || '0')),
      estado: String(formData.get('estado') || 'programada'),
      pago_estado: String(formData.get('pago_estado') || 'pendiente'),
      reminder_enabled: formData.get('reminder_enabled') === 'on',
      reminder_days_before: Number(formData.get('reminder_days_before') || 5),
      updated_by: profile.id,
    } as any)
    .eq('id', citaId)
  if (updateError) throw new Error(updateError.message)

  // Actualizar relación cita_pacientes
  await supabase.from('cita_pacientes').delete().eq('cita_id', citaId)
  if (pacienteIds.length > 0) {
    const rows = pacienteIds.map((pid) => ({ cita_id: citaId, paciente_id: pid }))
    const { error: inserError } = await supabase.from('cita_pacientes').insert(rows as any)
    if (inserError) throw new Error(inserError.message)
  }

  const observaciones = String(formData.get('notas') || '').trim()
  if (observaciones) {
    const { error: notasError } = await supabase.from('cita_notas').upsert({
      cita_id: citaId,
      observaciones_clinicas: observaciones,
      last_edited_by: profile.id,
      last_edited_at: new Date().toISOString(),
    } as any)
    if (notasError) throw new Error(notasError.message)
  } else {
    await supabase.from('cita_notas').delete().eq('cita_id', citaId)
  }

  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

export async function borrarCita(formData: FormData) {
  await requireProfile()
  const supabase: any = await createClient()
  const citaId = String(formData.get('cita_id') || '')
  if (!citaId) throw new Error('Cita no válida')

  // Validar que no esté en liquidación pagada
  const { data: cita, error: citaError } = await supabase
    .from('citas')
    .select('liquidacion_id')
    .eq('id', citaId)
    .single()
  if (citaError) throw new Error(citaError.message)

  if (cita?.liquidacion_id) {
    const { data: liquidacion } = await supabase
      .from('liquidaciones')
      .select('estado')
      .eq('id', cita.liquidacion_id)
      .single()
    if (liquidacion?.estado === 'pagada') throw new Error('No puedes borrar una cita en una liquidación pagada')
  }

  // Eliminar relaciones de pacientes
  await supabase.from('cita_pacientes').delete().eq('cita_id', citaId)

  // Eliminar cita
  const { error: deleteError } = await supabase.from('citas').delete().eq('id', citaId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

