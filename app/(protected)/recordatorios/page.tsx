import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export default async function RecordatoriosPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: citas } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,reminder_enabled,reminder_status,reminder_days_before,reminder_sent_at,servicios(nombre),colaboradores(nombre,apellidos)')
    .eq('reminder_enabled', true)
    .order('fecha')
    .order('hora_inicio')

  const pendientes = (citas ?? []).filter((c: any) => c.reminder_status === 'pendiente' && c.estado !== 'cancelada')
  const enviados = (citas ?? []).filter((c: any) => c.reminder_status === 'enviado')

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>Recordatorios pendientes</h3>
          <span className="tag">{pendientes.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cita</th><th>Servicio</th><th>Colaborador</th><th>Días antes</th><th>Estado</th></tr></thead>
            <tbody>
              {pendientes.length === 0 && <tr><td colSpan={5} className="center muted">Sin recordatorios pendientes</td></tr>}
              {pendientes.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.fecha}<br /><span className="subtle">{c.hora_inicio} - {c.hora_fin}</span></td>
                  <td>{c.servicios?.nombre ?? '—'}</td>
                  <td>{c.colaboradores ? `${c.colaboradores.nombre} ${c.colaboradores.apellidos || ''}` : '—'}</td>
                  <td>{c.reminder_days_before}</td>
                  <td><span className="tag warn"><span className="reminder-status pending">Pendiente</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Recordatorios enviados</h3>
          <span className="tag">{enviados.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cita</th><th>Servicio</th><th>Enviado</th><th>Estado</th></tr></thead>
            <tbody>
              {enviados.length === 0 && <tr><td colSpan={4} className="center muted">Sin recordatorios enviados</td></tr>}
              {enviados.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.fecha} · {c.hora_inicio}</td>
                  <td>{c.servicios?.nombre ?? '—'}</td>
                  <td>{c.reminder_sent_at ? new Date(c.reminder_sent_at).toLocaleString('es-ES') : '—'}</td>
                  <td><span className="tag ok"><span className="reminder-status sent">Enviado</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
