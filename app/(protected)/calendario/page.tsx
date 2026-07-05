import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearCita, editarCita } from './actions'
import { CalendarViews } from './calendar-views'

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ editId?: string }> }) {
  const profile: any = await requireProfile()
  const supabase = await createClient()
  const params = await searchParams
  const editId = params.editId || ''

  const isColaborador = profile.role === 'colaborador'
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor' || isColaborador

  const { data: allCitasData } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,reminder_enabled,reminder_days_before,notas,liquidacion_id,colaborador_id,supervisor_id,servicios(id,nombre),colaboradores(id,nombre,apellidos),supervisores(id,nombre,apellidos),cita_pacientes(pacientes(id,codigo,nombre,apellidos))')
    .order('fecha', { ascending: false })

  const allCitas = allCitasData ?? []

  const { data: serviciosData } = await supabase.from('servicios').select('id,nombre,precio_cents').eq('activo', true).order('nombre')
  const { data: pacientesData } = await supabase.from('pacientes').select('id,codigo,nombre,apellidos').eq('activo', true).order('codigo')
  const { data: colaboradoresData } = await supabase.from('colaboradores').select('id,nombre,apellidos').eq('activo', true).order('nombre')
  const { data: supervisoresData } = await supabase.from('supervisores').select('id,nombre,apellidos').eq('activo', true).order('nombre')

  const servicios = serviciosData ?? []
  const pacientes = pacientesData ?? []
  const colaboradores = colaboradoresData ?? []
  const supervisores = supervisoresData ?? []

  const today = new Date().toISOString().slice(0, 10)
  const editing = allCitas.find((c: any) => c.id === editId)

  let isLockedBecausePaid = false
  if (editing?.liquidacion_id) {
    const { data: liq } = await supabase.from('liquidaciones').select('estado').eq('id', editing.liquidacion_id).single()
    isLockedBecausePaid = liq?.estado === 'pagada'
  }

  function euroInput(cents: number) {
    return ((cents || 0) / 100).toFixed(2).replace('.', ',')
  }

  const pacientesSeleccionados = editing ? (editing.cita_pacientes || []).map((row: any) => row.pacientes?.id).filter(Boolean) : []

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>{editing ? `Editar cita - ${editing.fecha}` : 'Nueva cita'}</h3>
          {editing && <a href="/calendario" className="btn soft">Cancelar</a>}
        </div>
        {isLockedBecausePaid && <div className="note">⚠️ Cita bloqueada (liquidación pagada)</div>}
        <form className="compact-form" action={editing ? editarCita : crearCita}>
          {editing && <input type="hidden" name="cita_id" value={editing.id} />}
          <div className="row">
            <div className="field col-2">
              <label>Fecha</label>
              <input name="fecha" type="date" defaultValue={editing?.fecha || today} required disabled={isLockedBecausePaid} />
            </div>
            <div className="field col-2">
              <label>Inicio</label>
              <input name="hora_inicio" type="time" defaultValue={editing?.hora_inicio || '10:00'} required disabled={isLockedBecausePaid} />
            </div>
            <div className="field col-2">
              <label>Fin</label>
              <input name="hora_fin" type="time" defaultValue={editing?.hora_fin || '11:00'} required disabled={isLockedBecausePaid} />
            </div>
            <div className="field col-3">
              <label>Servicio</label>
              <select name="servicio_id" required disabled={isLockedBecausePaid} defaultValue={editing?.servicios?.id || ''}>
                <option value="">Elegir</option>
                {servicios.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="field col-3">
              <label>Precio (€)</label>
              <input name="precio" inputMode="decimal" defaultValue={editing ? euroInput(editing.precio_cents) : '0,00'} required disabled={isLockedBecausePaid} />
            </div>
            <div className="field col-4">
              <label>Pacientes</label>
              <select name="paciente_ids" multiple size={3} disabled={isLockedBecausePaid} defaultValue={pacientesSeleccionados}>
                {pacientes.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field col-3">
              <label>Colaborador</label>
              <select name="colaborador_id" required disabled={isColaborador || isLockedBecausePaid} defaultValue={editing?.colaborador_id || (isColaborador ? profile.colaborador_id : '')}>
                {!isColaborador && <option value="">Elegir</option>}
                {colaboradores.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {isColaborador && <input type="hidden" name="colaborador_id" value={profile.colaborador_id} />}
            </div>
            <div className="field col-3">
              <label>Supervisor</label>
              <select name="supervisor_id" disabled={isLockedBecausePaid} defaultValue={editing?.supervisor_id || ''}>
                <option value="">Sin supervisor</option>
                {supervisores.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="field col-2">
              <label>
                <input type="checkbox" name="reminder_enabled" defaultChecked={editing?.reminder_enabled ?? true} /> Recordatorio
              </label>
            </div>
            <div className="field col-2">
              <label>Días antes</label>
              <input name="reminder_days_before" type="number" min={0} max={60} defaultValue={editing?.reminder_days_before || 5} />
            </div>
            {editing && (
              <>
                <div className="field col-3">
                  <label>Estado</label>
                  <select name="estado" defaultValue={editing?.estado || 'programada'}>
                    <option value="programada">Programada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div className="field col-3">
                  <label>Pago</label>
                  <select name="pago_estado" defaultValue={editing?.pago_estado || 'pendiente'}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
              </>
            )}
            <div className="field col-12">
              <label>Notas</label>
              <textarea name="notas" defaultValue={editing?.notas || ''} placeholder="Observaciones clínicas..." />
            </div>
            <div className="field col-2">
              <button className="btn primary" type="submit">
                {editing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Citas</h3>
          <span className="tag">{allCitas.length}</span>
        </div>
        <CalendarViews citas={allCitas as any} canEdit={canEdit} />
      </section>
    </>
  )
}



