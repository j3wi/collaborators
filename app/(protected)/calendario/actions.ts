'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { eurosToCents } from '@/lib/money'

function addDaysISO(baseDate: string, days: number): string {
  const [year, month, day] = String(baseDate).split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function addMonthsISO(baseDate: string, months: number): string {
  const [year, month, day] = String(baseDate).split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

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
  const deleteMode = String(formData.get('delete_mode') || 'single')
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

  if (deleteMode !== 'following') {
    // Eliminar relaciones de pacientes
    await supabase.from('cita_pacientes').delete().eq('cita_id', citaId)

    // Eliminar cita
    const { error: deleteError } = await supabase.from('citas').delete().eq('id', citaId)
    if (deleteError) throw new Error(deleteError.message)
  } else {
    // Borrar esta y siguientes del mismo patron (mismo dia semana + hora + colaborador + paciente compartido)
    const { data: baseCita, error: baseError } = await supabase
      .from('citas')
      .select('id,fecha,hora_inicio,colaborador_id,servicio_id')
      .eq('id', citaId)
      .single()
    if (baseError || !baseCita) throw new Error(baseError?.message || 'No se encontro cita base')

    const baseWeekday = new Date(`${baseCita.fecha}T12:00:00`).getDay()
    const { data: basePatientRows } = await supabase.from('cita_pacientes').select('paciente_id').eq('cita_id', citaId)
    const basePatientIds = new Set((basePatientRows ?? []).map((row: any) => row.paciente_id).filter(Boolean))

    const { data: candidates } = await supabase
      .from('citas')
      .select('id,fecha,hora_inicio,colaborador_id,servicio_id,liquidacion_id')
      .gte('fecha', baseCita.fecha)
      .eq('hora_inicio', baseCita.hora_inicio)
      .eq('colaborador_id', baseCita.colaborador_id)

    const byWeekday = (candidates ?? []).filter((c: any) => {
      const weekday = new Date(`${c.fecha}T12:00:00`).getDay()
      return weekday === baseWeekday
    })

    const candidateIds = byWeekday.map((c: any) => c.id)
    let candidatesByPatient: any[] = byWeekday
    if (candidateIds.length && basePatientIds.size) {
      const { data: cpRows } = await supabase
        .from('cita_pacientes')
        .select('cita_id,paciente_id')
        .in('cita_id', candidateIds)

      const patientsByCita = new Map<string, Set<string>>()
      ;(cpRows ?? []).forEach((row: any) => {
        if (!patientsByCita.has(row.cita_id)) patientsByCita.set(row.cita_id, new Set())
        patientsByCita.get(row.cita_id)?.add(row.paciente_id)
      })

      candidatesByPatient = byWeekday.filter((c: any) => {
        const set = patientsByCita.get(c.id) ?? new Set<string>()
        for (const pid of set) {
          if (basePatientIds.has(pid)) return true
        }
        return false
      })
    }

    const liquidacionIds = [...new Set(candidatesByPatient.map((c: any) => c.liquidacion_id).filter(Boolean))]
    const paidLiquidaciones = new Set<string>()
    if (liquidacionIds.length) {
      const { data: liqRows } = await supabase.from('liquidaciones').select('id,estado').in('id', liquidacionIds)
      ;(liqRows ?? []).forEach((l: any) => { if (l.estado === 'pagada') paidLiquidaciones.add(l.id) })
    }

    const deletableIds = candidatesByPatient
      .filter((c: any) => !c.liquidacion_id || !paidLiquidaciones.has(c.liquidacion_id))
      .map((c: any) => c.id)

    if (deletableIds.length) {
      await supabase.from('cita_pacientes').delete().in('cita_id', deletableIds)
      await supabase.from('cita_notas').delete().in('cita_id', deletableIds)
      const { error: deleteSeriesError } = await supabase.from('citas').delete().in('id', deletableIds)
      if (deleteSeriesError) throw new Error(deleteSeriesError.message)
    }
  }

  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

export async function repetirCita(formData: FormData) {
  const profile = await requireProfile()
  const supabase: any = await createClient()

  const citaId = String(formData.get('cita_id') || '')
  const frecuencia = String(formData.get('frecuencia') || 'semanal')
  const repeticiones = Math.max(1, Math.min(52, Number(formData.get('repeticiones') || 4)))
  const repetirHasta = String(formData.get('repetir_hasta') || '')
  if (!citaId) throw new Error('Cita no valida')

  const { data: cita, error: citaError } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,servicio_id,colaborador_id,supervisor_id,precio_cents,reminder_enabled,reminder_days_before')
    .eq('id', citaId)
    .single()
  if (citaError || !cita) throw new Error(citaError?.message || 'No se encontro la cita')

  const { data: pacientesRows } = await supabase
    .from('cita_pacientes')
    .select('paciente_id')
    .eq('cita_id', citaId)

  const { data: notasRow } = await supabase
    .from('cita_notas')
    .select('observaciones_clinicas,acuerdos_tareas,incidencias')
    .eq('cita_id', citaId)
    .maybeSingle()

  for (let i = 1; i <= repeticiones; i += 1) {
    const fechaNueva =
      frecuencia === 'diaria'
        ? addDaysISO(cita.fecha, i)
        : frecuencia === 'mensual'
          ? addMonthsISO(cita.fecha, i)
          : addDaysISO(cita.fecha, i * 7)

    if (repetirHasta && fechaNueva > repetirHasta) break

    const { data: nuevaCita, error: nuevaError } = await supabase
      .from('citas')
      .insert({
        fecha: fechaNueva,
        hora_inicio: cita.hora_inicio,
        hora_fin: cita.hora_fin,
        servicio_id: cita.servicio_id,
        colaborador_id: cita.colaborador_id,
        supervisor_id: cita.supervisor_id,
        precio_cents: cita.precio_cents,
        estado: 'programada',
        pago_estado: 'pendiente',
        reminder_enabled: cita.reminder_enabled,
        reminder_days_before: cita.reminder_days_before,
        created_by: profile.id,
      } as any)
      .select('id')
      .single()
    if (nuevaError) throw new Error(nuevaError.message)

    if (nuevaCita && (pacientesRows ?? []).length > 0) {
      const rows = (pacientesRows ?? []).map((row: any) => ({ cita_id: nuevaCita.id, paciente_id: row.paciente_id }))
      const { error: pacientesError } = await supabase.from('cita_pacientes').insert(rows as any)
      if (pacientesError) throw new Error(pacientesError.message)
    }

    if (nuevaCita && notasRow) {
      const { error: notasError } = await supabase.from('cita_notas').upsert({
        cita_id: nuevaCita.id,
        observaciones_clinicas: notasRow.observaciones_clinicas || '',
        acuerdos_tareas: notasRow.acuerdos_tareas || '',
        incidencias: notasRow.incidencias || '',
        last_edited_by: profile.id,
        last_edited_at: new Date().toISOString(),
      } as any)
      if (notasError) throw new Error(notasError.message)
    }
  }

  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

