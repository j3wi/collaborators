import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'
import { crearCita } from './actions'

export default async function CalendarioPage() {
  const profile: any = await requireProfile()
  const supabase = await createClient()

  const isColaborador = profile.role === 'colaborador'

  const { data: citas } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,reminder_enabled,servicios(nombre),colaboradores(nombre,apellidos),supervisores(nombre,apellidos)')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })

  const { data: servicios } = await supabase
    .from('servicios')
    .select('id,nombre,precio_cents,duracion_min')
    .eq('activo', true)
    .order('nombre')

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id,codigo,nombre,apellidos')
    .eq('activo', true)
    .order('codigo')

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id,nombre,apellidos')
    .eq('activo', true)
    .order('nombre')

  const { data: supervisores } = await supabase
    .from('supervisores')
    .select('id,nombre,apellidos')
    .eq('activo', true)
    .order('nombre')

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      {/* Formulario de nueva cita */}
      <section className="panel">
        <div className="panel-head"><h3>Nueva cita</h3></div>
        <form className="compact-form" action={crearCita}>
          <div className="row">
            <div className="field col-2">
              <label>Fecha</label>
              <input name="fecha" type="date" defaultValue={today} required />
            </div>
            <div className="field col-2">
              <label>Inicio</label>
              <input name="hora_inicio" type="time" defaultValue="10:00" required />
            </div>
            <div className="field col-2">
              <label>Fin</label>
              <input name="hora_fin" type="time" defaultValue="11:00" required />
            </div>
            <div className="field col-3">
              <label>Servicio</label>
              <select name="servicio_id" required>
                <option value="">Elegir</option>
                {(servicios ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field col-3">
              <label>Precio aplicado (€)</label>
              <input name="precio" inputMode="decimal" defaultValue="0,00" required />
            </div>
            <div className="field col-4">
              <label>Participantes (pacientes)</label>
              <select name="paciente_ids" multiple size={4}>
                {(pacientes ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.codigo} · {p.nombre} {p.apellidos || ''}</option>
                ))}
              </select>
            </div>
            <div className="field col-3">
              <label>Colaborador</label>
              <select name="colaborador_id" required disabled={isColaborador} defaultValue={isColaborador ? profile.colaborador_id : ''}>
                {!isColaborador && <option value="">Elegir</option>}
                {(colaboradores ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellidos || ''}
                  </option>
                ))}
              </select>
              {isColaborador && <input type="hidden" name="colaborador_id" value={profile.colaborador_id || ''} />}
            </div>
            <div className="field col-3">
              <label>Supervisor</label>
              <select name="supervisor_id">
                <option value="">Sin supervisor</option>
                {(supervisores ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nombre} {s.apellidos || ''}</option>
                ))}
              </select>
            </div>
            <div className="field col-2">
              <label>Recordatorio</label>
              <label className="checkline">
                <input type="checkbox" name="reminder_enabled" defaultChecked /> Sí
              </label>
            </div>
            <div className="field col-2">
              <label>Días antes</label>
              <input name="reminder_days_before" type="number" min={0} max={60} defaultValue={5} />
            </div>
            <div className="field col-2">
              <button className="btn primary" type="submit">Guardar cita</button>
            </div>
          </div>
        </form>
      </section>

      {/* Listado de citas */}
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
                      : <span>{estado}</span>}
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
    </>
  )
}
