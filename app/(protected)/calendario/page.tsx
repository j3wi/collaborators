import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'

export default async function CalendarioPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: citas } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,reminder_enabled,servicios(nombre),colaboradores(nombre,apellidos),supervisores(nombre,apellidos)')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Citas</h3>
        <div className="view-toggle no-print">
          <span className="tag">{citas?.length ?? 0}</span>
        </div>
      </div>
      <div className="calendar-legend subtle">
        <span><i className="legend-dot"></i> Programada</span>
        <span><i className="legend-dot realizada"></i> Realizada</span>
        <span><i className="legend-dot pagada"></i> Pagada</span>
        <span><i className="legend-dot cancelada"></i> Cancelada</span>
      </div>
      <div className="calendar-list">
        {(citas ?? []).length === 0 && <div className="note">No hay citas para mostrar.</div>}
        {(citas ?? []).map((c: any) => {
          const estado = c.estado || 'programada'
          const pago = c.pago_estado || 'pendiente'
          return (
            <div key={c.id} className="appt-card">
              <div>
                <strong>{c.fecha}</strong>
                <div className="appt-time">{c.hora_inicio} - {c.hora_fin}</div>
              </div>
              <div>
                <div>
                  {c.servicios?.nombre ?? 'Servicio'} · {centsToEuros(c.precio_cents)}
                </div>
                <div className="subtle">
                  {c.colaboradores ? `${c.colaboradores.nombre} ${c.colaboradores.apellidos || ''}` : '—'}
                  {c.supervisores ? ` · ${c.supervisores.nombre} ${c.supervisores.apellidos || ''}` : ''}
                  {' · '}
                  {estado === 'realizada'
                    ? <span className="ok-text">Realizada</span>
                    : estado === 'cancelada'
                    ? <span className="tag danger">Cancelada</span>
                    : estado}
                  {' · '}
                  {pago === 'pagada'
                    ? <span className="tag ok">Pagada</span>
                    : <span className="tag warn">Pendiente</span>}
                </div>
                {c.reminder_enabled && <div className="subtle">Recordatorio email preparado</div>}
              </div>
              <div className="button-line no-print">
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
