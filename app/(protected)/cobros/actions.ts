'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile, canManageLiquidaciones } from '@/lib/auth/server'
import { calcLiquidacion } from '@/lib/money'
export async function crearLiquidacion(citaIds: string[], colaboradorId: string, supervisorId: string | null, desde: string, hasta: string) {
  const profile = await requireProfile(); if (!canManageLiquidaciones(profile)) throw new Error('No tienes permisos para crear liquidaciones.'); if (!citaIds.length) throw new Error('Debes seleccionar al menos una cita.')
  const supabase = await createClient(); const { data: citas, error } = await supabase.from('citas').select('id, precio_cents, estado, liquidacion_id').in('id', citaIds)
  if (error) throw new Error(error.message); const liquidables = (citas ?? []).filter((c: any) => !c.liquidacion_id); if (!liquidables.length) throw new Error('Las citas seleccionadas ya están liquidadas.')
  const totals = calcLiquidacion(liquidables.map((c: any) => c.precio_cents), 15); const numero = `LIQ-${new Date().getFullYear()}-${Date.now()}`
  const { data: liq, error: liqError } = await supabase.from('liquidaciones').insert({ numero, colaborador_id: colaboradorId, supervisor_id: supervisorId, periodo_desde: desde, periodo_hasta: hasta, subtotal_cents: totals.subtotal, irpf_percent: 15, irpf_cents: totals.irpf, total_cents: totals.total, created_by: profile.id }).select().single()
  if (liqError) throw new Error(liqError.message)
  const rows = liquidables.map((c: any) => ({ liquidacion_id: liq.id, cita_id: c.id, precio_cents_snapshot: c.precio_cents, estado_cita_snapshot: c.estado }))
  const { error: rowsError } = await supabase.from('liquidacion_citas').insert(rows); if (rowsError) throw new Error(rowsError.message)
  const { error: updateError } = await supabase.from('citas').update({ liquidacion_id: liq.id }).in('id', liquidables.map((c: any) => c.id)); if (updateError) throw new Error(updateError.message)
  revalidatePath('/cobros')
}
