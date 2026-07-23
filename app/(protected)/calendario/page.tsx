import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireProfile } from '@/lib/auth/server'
import { borrarCita, crearCita, editarCita, repetirCita } from './actions'
import { getFollowingDeleteCount, getFollowingDeleteLabel, type DeleteSeriesCita } from './delete-utils'
import { CalendarViews } from './calendar-views'
import { CitaForm } from './cita-form'

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ editId?: string; createDate?: string; createTime?: string; view?: 'list' | 'month' | 'week'; currentDate?: string; new?: string }> }) {
  const profile: any = await requireProfile()
  const supabase = await createClient()
  const admin = createAdminClient()
  const params = await searchParams
  const editId = params.editId || ''
  const createDate = params.createDate || ''
  const createTime = params.createTime || ''
  const newMode = params.new || ''
  const initialView = params.view
  const initialDate = params.currentDate || createDate || ''

  const isColaborador = profile.role === 'colaborador'
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor' || isColaborador

  const { data: serviciosData } = await admin.from('servicios').select('id,nombre,precio_cents').eq('activo', true).order('nombre')
  const { data: pacientesData } = await admin.from('pacientes').select('id,codigo,nombre,apellidos').eq('activo', true).order('codigo')
  const { data: colaboradoresData } = await admin.from('colaboradores').select('id,nombre,apellidos').eq('activo', true).order('nombre')
  const { data: supervisoresData } = await admin.from('supervisores').select('id,nombre,apellidos').eq('activo', true).order('nombre')

  const servicios: any[] = serviciosData ?? []
  const pacientes: any[] = pacientesData ?? []
  const colaboradores: any[] = colaboradoresData ?? []
  const supervisores: any[] = supervisoresData ?? []

  let citasQuery = admin
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,reminder_enabled,reminder_days_before,liquidacion_id,colaborador_id,supervisor_id,servicios(id,nombre),colaboradores(id,nombre,apellidos),supervisores(id,nombre,apellidos),cita_pacientes(pacientes(id,codigo,nombre,apellidos)),cita_notas(observaciones_clinicas,acuerdos_tareas,incidencias,last_edited_at,last_edited_by)')
    .order('fecha', { ascending: false })

  if (isColaborador && profile.colaborador_id) {
    citasQuery = citasQuery.eq('colaborador_id', profile.colaborador_id)
  }

  const { data: allCitasData, error: citasError } = await citasQuery

  let allCitas: any[] = (allCitasData as any[]) ?? []

  // Fallback defensivo: si falla el select con relaciones, recuperar citas base y mapear nombres.
  if (citasError) {
    let baseCitasQuery = admin
      .from('citas')
      .select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,reminder_enabled,reminder_days_before,liquidacion_id,colaborador_id,supervisor_id,servicio_id')
      .order('fecha', { ascending: false })

    if (isColaborador && profile.colaborador_id) {
      baseCitasQuery = baseCitasQuery.eq('colaborador_id', profile.colaborador_id)
    }

    const { data: baseCitas } = await baseCitasQuery

    const serviciosById = new Map(servicios.map((s: any) => [s.id, s]))
    const colaboradoresById = new Map(colaboradores.map((c: any) => [c.id, c]))
    const supervisoresById = new Map(supervisores.map((s: any) => [s.id, s]))

    const { data: citaPacientes } = await admin
      .from('cita_pacientes')
      .select('cita_id,pacientes(id,codigo,nombre,apellidos)')

    const { data: citaNotasRows } = await admin
      .from('cita_notas')
      .select('cita_id,observaciones_clinicas,acuerdos_tareas,incidencias,last_edited_at,last_edited_by')

    const pacientesByCita = new Map<string, any[]>()
    ;(citaPacientes ?? []).forEach((row: any) => {
      if (!pacientesByCita.has(row.cita_id)) pacientesByCita.set(row.cita_id, [])
      if (row.pacientes) pacientesByCita.get(row.cita_id)?.push({ pacientes: row.pacientes })
    })

    const notasByCita = new Map<string, any[]>()
    ;(citaNotasRows ?? []).forEach((row: any) => {
      notasByCita.set(row.cita_id, [{
        observaciones_clinicas: row.observaciones_clinicas || '',
        acuerdos_tareas: row.acuerdos_tareas || '',
        incidencias: row.incidencias || '',
        last_edited_at: row.last_edited_at || null,
        last_edited_by: row.last_edited_by || null,
      }])
    })

    allCitas = (baseCitas ?? []).map((cita: any) => ({
      ...cita,
      servicios: cita.servicio_id ? serviciosById.get(cita.servicio_id) ?? null : null,
      colaboradores: cita.colaborador_id ? colaboradoresById.get(cita.colaborador_id) ?? null : null,
      supervisores: cita.supervisor_id ? supervisoresById.get(cita.supervisor_id) ?? null : null,
      cita_pacientes: pacientesByCita.get(cita.id) ?? [],
      cita_notas: notasByCita.get(cita.id) ?? [],
    }))
  }

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

  function addOneHour(time: string): string {
    const [h, m] = String(time || '10:00').split(':').map(Number)
    const hour = Number.isFinite(h) ? h : 10
    const minute = Number.isFinite(m) ? m : 0
    return `${String((hour + 1) % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  function getObservaciones(cita: any): string {
    if (!cita) return ''
    if (Array.isArray(cita.cita_notas)) return cita.cita_notas[0]?.observaciones_clinicas || ''
    return cita.cita_notas?.observaciones_clinicas || ''
  }

  function getAcuerdos(cita: any): string {
    if (!cita) return ''
    if (Array.isArray(cita.cita_notas)) return cita.cita_notas[0]?.acuerdos_tareas || ''
    return cita.cita_notas?.acuerdos_tareas || ''
  }

  function getIncidencias(cita: any): string {
    if (!cita) return ''
    if (Array.isArray(cita.cita_notas)) return cita.cita_notas[0]?.incidencias || ''
    return cita.cita_notas?.incidencias || ''
  }

  const pacientesSeleccionados = editing ? (editing.cita_pacientes || []).map((row: any) => row.pacientes?.id).filter(Boolean) : []
  const defaultFecha = editing?.fecha || createDate || today
  const defaultInicio = editing?.hora_inicio || createTime || '10:00'
  const defaultFin = editing?.hora_fin || addOneHour(defaultInicio)
  const followingDeleteCount = editing ? getFollowingDeleteCount(editing as DeleteSeriesCita, allCitas as DeleteSeriesCita[]) : 0
  const showCitaForm = Boolean(editing || createDate || createTime || newMode === '1')

  return (
    <>
      {showCitaForm && <section className="panel">
        <div className="panel-head">
          <h3>{editing ? `Editar cita - ${editing.fecha}` : 'Nueva cita'}</h3>
          {editing && <a href="/calendario" className="btn soft">Cancelar</a>}
          {!editing && <a href={`/calendario?view=${initialView}&currentDate=${initialDate || today}`} className="btn soft">Cerrar</a>}
        </div>
        {isLockedBecausePaid && <div className="note">⚠️ Cita bloqueada (liquidación pagada)</div>}
        <CitaForm
          action={editing ? editarCita : crearCita}
          isEditing={Boolean(editing)}
          editingId={editing?.id || ''}
          isLockedBecausePaid={isLockedBecausePaid}
          isColaborador={isColaborador}
          profileColaboradorId={String(profile.colaborador_id || '')}
          servicios={servicios}
          pacientes={pacientes}
          colaboradores={colaboradores}
          supervisores={supervisores}
          defaults={{
            fecha: defaultFecha,
            horaInicio: defaultInicio,
            horaFin: defaultFin,
            servicioId: editing?.servicios?.id || '',
            precio: editing ? euroInput(editing.precio_cents) : '0,00',
            pacienteIds: pacientesSeleccionados,
            colaboradorId: editing?.colaborador_id || (isColaborador ? String(profile.colaborador_id || '') : ''),
            supervisorId: editing?.supervisor_id || '',
            reminderEnabled: editing?.reminder_enabled ?? true,
            reminderDaysBefore: editing?.reminder_days_before || 5,
            estado: editing?.estado || 'programada',
            pagoEstado: editing?.pago_estado || 'pendiente',
            observaciones: getObservaciones(editing),
            acuerdos: getAcuerdos(editing),
            incidencias: getIncidencias(editing),
          }}
        />
        {editing && (
          <form id="repetir" className="compact-form" action={repetirCita} style={{ marginTop: '8px' }}>
            <input type="hidden" name="cita_id" value={editing.id} />
            <div className="row">
              <div className="field col-3">
                <label>Modo</label>
                <select name="repeat_mode" defaultValue="count">
                  <option value="count">Numero de veces</option>
                  <option value="until">Hasta fecha</option>
                </select>
              </div>
              <div className="field col-3">
                <label>Repetir</label>
                <select name="frecuencia" defaultValue="semanal">
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <div className="field col-2">
                <label>Veces</label>
                <input type="number" name="repeticiones" min={1} max={52} defaultValue={4} />
              </div>
              <div className="field col-3">
                <label>Repetir hasta (opcional)</label>
                <input type="date" name="repetir_hasta" />
              </div>
              <div className="field col-3">
                <button className="btn soft" type="submit">Crear repeticiones</button>
              </div>
            </div>
          </form>
        )}

        {editing && (
          <form id="borrar" className="compact-form" action={borrarCita} style={{ marginTop: '8px' }}>
            <input type="hidden" name="cita_id" value={editing.id} />
            <div className="row">
              <div className="field col-4">
                <label>Borrar cita</label>
                <select name="delete_mode" defaultValue="single">
                  <option value="single">Solo esta cita</option>
                  {followingDeleteCount > 0 && (
                    <option value="following">{getFollowingDeleteLabel(followingDeleteCount)}</option>
                  )}
                </select>
              </div>
              <div className="field col-3">
                <button className="btn danger" type="submit">Borrar</button>
              </div>
            </div>
          </form>
        )}
      </section>}

      <section className="panel">
        <div className="panel-head">
          <h3>Citas</h3>
          <span className="tag">{allCitas.length}</span>
        </div>
        <CalendarViews
          citas={allCitas as any}
          canEdit={canEdit}
          initialView={initialView}
          initialDate={initialDate}
        />
      </section>
    </>
  )
}



