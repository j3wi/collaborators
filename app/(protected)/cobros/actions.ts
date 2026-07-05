'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile, canManageLiquidaciones } from '@/lib/auth/server'
import { calcLiquidacion } from '@/lib/money'

function parseIds(raw: FormDataEntryValue | null) {
  return String(raw || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export async function crearLiquidacionesDesdeSeleccion(formData: FormData) {
  const profile = await requireProfile()
  if (!canManageLiquidaciones(profile)) throw new Error('Sin permiso')

  const citaIds = parseIds(formData.get('cita_ids'))
  const desde = String(formData.get('desde') || '')
  const hasta = String(formData.get('hasta') || '')
  if (!citaIds.length) throw new Error('Selecciona al menos una cita')

  const supabase: any = await createClient()
  const { data: citas, error } = await supabase
    .from('citas')
    .select('id,precio_cents,estado,pago_estado,liquidacion_id,colaborador_id,supervisor_id')
    .in('id', citaIds)

  if (error) throw new Error(error.message)

  const eligible = (citas ?? []).filter((cita: any) => !cita.liquidacion_id && cita.pago_estado !== 'pagada' && cita.colaborador_id)
  if (!eligible.length) throw new Error('No hay citas pendientes sin liquidar en la seleccion')

  const groups = new Map<string, any[]>()
  eligible.forEach((cita: any) => {
    const key = String(cita.colaborador_id)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(cita)
  })

  let index = 1
  for (const [colaboradorId, groupRows] of groups.entries()) {
    const totals = calcLiquidacion(groupRows.map((row: any) => Number(row.precio_cents) || 0), 15)
    const supervisorIds = [...new Set(groupRows.map((row: any) => row.supervisor_id).filter(Boolean))]
    const supervisorId = supervisorIds.length === 1 ? supervisorIds[0] : null
    const numero = `LIQ-${new Date().getFullYear()}-${Date.now()}-${index}`

    const { data: liquidacion, error: liqError } = await supabase
      .from('liquidaciones')
      .insert({
        numero,
        colaborador_id: colaboradorId,
        supervisor_id: supervisorId,
        periodo_desde: desde,
        periodo_hasta: hasta,
        subtotal_cents: totals.subtotal,
        irpf_percent: 15,
        irpf_cents: totals.irpf,
        total_cents: totals.total,
        estado: 'pendiente',
        created_by: profile.id,
      })
      .select('id')
      .single()

    if (liqError) throw new Error(liqError.message)

    const rows = groupRows.map((cita: any) => ({
      liquidacion_id: liquidacion.id,
      cita_id: cita.id,
      precio_cents_snapshot: cita.precio_cents,
      estado_cita_snapshot: cita.estado,
    }))
    const { error: rowsError } = await supabase.from('liquidacion_citas').insert(rows)
    if (rowsError) throw new Error(rowsError.message)

    const { error: updateError } = await supabase
      .from('citas')
      .update({ liquidacion_id: liquidacion.id })
      .in('id', groupRows.map((cita: any) => cita.id))
    if (updateError) throw new Error(updateError.message)

    index += 1
  }

  revalidatePath('/cobros')
}

export async function actualizarCitasSeleccion(formData: FormData) {
  const profile = await requireProfile()
  if (!canManageLiquidaciones(profile)) throw new Error('Sin permiso')

  const citaIds = parseIds(formData.get('cita_ids'))
  const pagoEstado = String(formData.get('pago_estado') || '')
  const estado = String(formData.get('estado') || '')
  if (!citaIds.length) throw new Error('Selecciona al menos una cita')

  const supabase: any = await createClient()
  const { data: citas, error } = await supabase.from('citas').select('id,liquidacion_id').in('id', citaIds)
  if (error) throw new Error(error.message)

  const editableIds = (citas ?? []).filter((cita: any) => !cita.liquidacion_id).map((cita: any) => cita.id)
  if (!editableIds.length) throw new Error('Las citas seleccionadas tienen liquidacion y no pueden editarse en bloque')

  const payload: Record<string, any> = {}
  if (pagoEstado === 'pendiente' || pagoEstado === 'pagada') payload.pago_estado = pagoEstado
  if (estado) payload.estado = estado
  if (!Object.keys(payload).length) throw new Error('No se enviaron cambios')

  const { error: updateError } = await supabase.from('citas').update(payload).in('id', editableIds)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/cobros')
}

export async function marcarLiquidacionPagada(formData: FormData) {
  const profile = await requireProfile()
  if (!canManageLiquidaciones(profile)) throw new Error('Sin permiso')

  const liquidacionId = String(formData.get('liquidacion_id') || '')
  const paymentDate = String(formData.get('payment_date') || '')
  const paymentMethod = String(formData.get('payment_method') || '')
  if (!liquidacionId) throw new Error('Liquidacion no valida')

  const supabase: any = await createClient()
  const { error: liqError } = await supabase
    .from('liquidaciones')
    .update({
      estado: 'pagada',
      payment_date: paymentDate || null,
      payment_method: paymentMethod || null,
    })
    .eq('id', liquidacionId)
  if (liqError) throw new Error(liqError.message)

  const { data: rows, error: rowsError } = await supabase
    .from('liquidacion_citas')
    .select('cita_id')
    .eq('liquidacion_id', liquidacionId)
  if (rowsError) throw new Error(rowsError.message)

  const citaIds = (rows ?? []).map((row: any) => row.cita_id).filter(Boolean)
  if (citaIds.length) {
    const { error: citasError } = await supabase
      .from('citas')
      .update({ pago_estado: 'pagada' })
      .in('id', citaIds)
    if (citasError) throw new Error(citasError.message)
  }

  revalidatePath('/cobros')
}

export async function marcarLiquidacionPendiente(formData: FormData) {
  const profile = await requireProfile()
  if (!canManageLiquidaciones(profile)) throw new Error('Sin permiso')

  const liquidacionId = String(formData.get('liquidacion_id') || '')
  if (!liquidacionId) throw new Error('Liquidacion no valida')

  const supabase: any = await createClient()
  const { error: liqError } = await supabase
    .from('liquidaciones')
    .update({ estado: 'pendiente', payment_date: null, payment_method: null })
    .eq('id', liquidacionId)
  if (liqError) throw new Error(liqError.message)

  const { data: rows, error: rowsError } = await supabase
    .from('liquidacion_citas')
    .select('cita_id')
    .eq('liquidacion_id', liquidacionId)
  if (rowsError) throw new Error(rowsError.message)

  const citaIds = (rows ?? []).map((row: any) => row.cita_id).filter(Boolean)
  if (citaIds.length) {
    const { error: citasError } = await supabase
      .from('citas')
      .update({ pago_estado: 'pendiente' })
      .in('id', citaIds)
    if (citasError) throw new Error(citasError.message)
  }

  revalidatePath('/cobros')
}

export async function borrarLiquidacion(formData: FormData) {
  const profile = await requireProfile()
  if (!canManageLiquidaciones(profile)) throw new Error('Sin permiso')

  const liquidacionId = String(formData.get('liquidacion_id') || '')
  if (!liquidacionId) throw new Error('Liquidacion no valida')

  const supabase: any = await createClient()
  const { data: liquidacion, error: liqReadError } = await supabase
    .from('liquidaciones')
    .select('id,estado')
    .eq('id', liquidacionId)
    .single()
  if (liqReadError) throw new Error(liqReadError.message)
  if (liquidacion?.estado === 'pagada') throw new Error('No puedes borrar una liquidacion pagada')

  const { data: rows, error: rowsError } = await supabase
    .from('liquidacion_citas')
    .select('cita_id')
    .eq('liquidacion_id', liquidacionId)
  if (rowsError) throw new Error(rowsError.message)

  const citaIds = (rows ?? []).map((row: any) => row.cita_id).filter(Boolean)
  if (citaIds.length) {
    const { error: citasError } = await supabase
      .from('citas')
      .update({ liquidacion_id: null })
      .in('id', citaIds)
    if (citasError) throw new Error(citasError.message)
  }

  const { error: deleteRowsError } = await supabase.from('liquidacion_citas').delete().eq('liquidacion_id', liquidacionId)
  if (deleteRowsError) throw new Error(deleteRowsError.message)

  const { error: deleteLiqError } = await supabase.from('liquidaciones').delete().eq('id', liquidacionId)
  if (deleteLiqError) throw new Error(deleteLiqError.message)

  revalidatePath('/cobros')
}
