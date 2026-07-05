import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { RecordatoriosTable } from './recordatorios-table'

export default async function RecordatoriosPage() {
  await requireProfile()
  const supabase = await createClient()

  const { data: citas } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,reminder_enabled,reminder_status,reminder_days_before,reminder_sent_at,servicios(nombre),colaboradores(nombre,apellidos,email),supervisores(nombre,apellidos,email),cita_pacientes(pacientes(id,codigo,nombre,apellidos,email))')
    .eq('reminder_enabled', true)
    .order('fecha')
    .order('hora_inicio')

  const rows = (citas ?? []).map((c: any) => ({
    id: c.id,
    fecha: c.fecha || '',
    horaInicio: c.hora_inicio || '',
    horaFin: c.hora_fin || '',
    estado: c.estado || '',
    reminderStatus: c.reminder_status || '',
    reminderDaysBefore: Number(c.reminder_days_before) || 0,
    reminderSentAt: c.reminder_sent_at || '',
    servicio: c.servicios?.nombre || '',
    colaboradorNombre: c.colaboradores ? `${c.colaboradores.nombre || ''} ${c.colaboradores.apellidos || ''}`.trim() : '',
    colaboradorEmail: c.colaboradores?.email || '',
    supervisorNombre: c.supervisores ? `${c.supervisores.nombre || ''} ${c.supervisores.apellidos || ''}`.trim() : '',
    supervisorEmail: c.supervisores?.email || '',
    pacientes: (c.cita_pacientes || [])
      .map((row: any) => row.pacientes)
      .filter(Boolean)
      .map((patient: any) => ({
        id: patient.id,
        codigo: patient.codigo || '',
        nombre: patient.nombre || '',
        apellidos: patient.apellidos || '',
        email: patient.email || '',
      })),
  }))

  return (
    <RecordatoriosTable rows={rows} />
  )
}
