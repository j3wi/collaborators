'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { eurosToCents } from '@/lib/money'
export async function crearCita(formData: FormData) {
  const profile = await requireProfile(); const supabase = await createClient()
  const { error } = await supabase.from('citas').insert({ fecha: String(formData.get('fecha')), hora_inicio: String(formData.get('hora_inicio')), hora_fin: String(formData.get('hora_fin')), servicio_id: String(formData.get('servicio_id') || '') || null, colaborador_id: String(formData.get('colaborador_id')), supervisor_id: String(formData.get('supervisor_id') || '') || null, precio_cents: eurosToCents(String(formData.get('precio') || '0')), estado: 'programada', pago_estado: 'pendiente', reminder_enabled: formData.get('reminder_enabled') === 'on', reminder_days_before: Number(formData.get('reminder_days_before') || 5), created_by: profile.id })
  if (error) throw new Error(error.message); revalidatePath('/calendario')
}
