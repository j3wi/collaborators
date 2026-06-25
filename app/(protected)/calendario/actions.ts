'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { eurosToCents } from '@/lib/money'
export async function crearCita(formData: FormData) {
  const profile = await requireProfile(); const supabase = await createClient()
  const pacienteIds = formData.getAll('paciente_ids').map(String).filter(Boolean)
  const { data: cita, error } = await supabase.from('citas').insert({ fecha: String(formData.get('fecha')), hora_inicio: String(formData.get('hora_inicio')), hora_fin: String(formData.get('hora_fin')), servicio_id: String(formData.get('servicio_id') || '') || null, colaborador_id: String(formData.get('colaborador_id')), supervisor_id: String(formData.get('supervisor_id') || '') || null, precio_cents: eurosToCents(String(formData.get('precio') || '0')), estado: 'programada', pago_estado: 'pendiente', reminder_enabled: formData.get('reminder_enabled') === 'on', reminder_days_before: Number(formData.get('reminder_days_before') || 5), created_by: profile.id } as any).select('id').single()
  if (error) throw new Error(error.message)
  if (cita && pacienteIds.length > 0) {
    const rows = pacienteIds.map(pid => ({ cita_id: (cita as any).id, paciente_id: pid }))
    await supabase.from('cita_pacientes').insert(rows as any)
  }
  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}
