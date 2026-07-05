'use client'

import { useMemo, useState } from 'react'

type ServerAction = (formData: FormData) => void | Promise<void>

type Option = {
  id: string
  nombre: string
  apellidos?: string
  codigo?: string
  precio_cents?: number
}

type Props = {
  action: ServerAction
  isEditing: boolean
  editingId: string
  isLockedBecausePaid: boolean
  isColaborador: boolean
  profileColaboradorId: string
  servicios: Option[]
  pacientes: Option[]
  colaboradores: Option[]
  supervisores: Option[]
  defaults: {
    fecha: string
    horaInicio: string
    horaFin: string
    servicioId: string
    precio: string
    pacienteIds: string[]
    colaboradorId: string
    supervisorId: string
    reminderEnabled: boolean
    reminderDaysBefore: number
    estado: string
    pagoEstado: string
    observaciones: string
    acuerdos: string
    incidencias: string
  }
}

function centsToInput(cents: number): string {
  return ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',')
}

export function CitaForm({
  action,
  isEditing,
  editingId,
  isLockedBecausePaid,
  isColaborador,
  profileColaboradorId,
  servicios,
  pacientes,
  colaboradores,
  supervisores,
  defaults,
}: Props) {
  const [precio, setPrecio] = useState(defaults.precio)

  const serviciosById = useMemo(() => {
    const map = new Map<string, Option>()
    servicios.forEach((s) => map.set(s.id, s))
    return map
  }, [servicios])

  return (
    <form className="compact-form" action={action}>
      {isEditing && <input type="hidden" name="cita_id" value={editingId} />}
      <div className="row">
        <div className="field col-2">
          <label>Fecha</label>
          <input name="fecha" type="date" defaultValue={defaults.fecha} required disabled={isLockedBecausePaid} />
        </div>
        <div className="field col-2">
          <label>Inicio</label>
          <input name="hora_inicio" type="time" defaultValue={defaults.horaInicio} required disabled={isLockedBecausePaid} />
        </div>
        <div className="field col-2">
          <label>Fin</label>
          <input name="hora_fin" type="time" defaultValue={defaults.horaFin} required disabled={isLockedBecausePaid} />
        </div>
        <div className="field col-3">
          <label>Servicio</label>
          <select
            name="servicio_id"
            required
            disabled={isLockedBecausePaid}
            defaultValue={defaults.servicioId}
            onChange={(event) => {
              const servicio = serviciosById.get(event.target.value)
              if (!servicio || !Number.isFinite(Number(servicio.precio_cents))) return
              setPrecio(centsToInput(Number(servicio.precio_cents)))
            }}
          >
            <option value="">Elegir</option>
            {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="field col-3">
          <label>Precio (€)</label>
          <input name="precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} required disabled={isLockedBecausePaid} />
        </div>
        <div className="field col-4">
          <label>Pacientes</label>
          <select name="paciente_ids" multiple size={3} disabled={isLockedBecausePaid} defaultValue={defaults.pacienteIds}>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo || '---'} · {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field col-3">
          <label>Colaborador</label>
          <select name="colaborador_id" required disabled={isColaborador || isLockedBecausePaid} defaultValue={defaults.colaboradorId}>
            {!isColaborador && <option value="">Elegir</option>}
            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos || ''}</option>)}
          </select>
          {isColaborador && <input type="hidden" name="colaborador_id" value={profileColaboradorId} />}
        </div>
        <div className="field col-3">
          <label>Supervisor</label>
          <select name="supervisor_id" disabled={isLockedBecausePaid} defaultValue={defaults.supervisorId}>
            <option value="">Sin supervisor</option>
            {supervisores.map((s) => <option key={s.id} value={s.id}>{s.nombre} {s.apellidos || ''}</option>)}
          </select>
        </div>
        <div className="field col-2">
          <label>
            <input type="checkbox" name="reminder_enabled" defaultChecked={defaults.reminderEnabled} /> Recordatorio
          </label>
        </div>
        <div className="field col-2">
          <label>Días antes</label>
          <input name="reminder_days_before" type="number" min={0} max={60} defaultValue={defaults.reminderDaysBefore} />
        </div>
        {isEditing && (
          <>
            <div className="field col-3">
              <label>Estado</label>
              <select name="estado" defaultValue={defaults.estado}>
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="field col-3">
              <label>Pago</label>
              <select name="pago_estado" defaultValue={defaults.pagoEstado}>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
              </select>
            </div>
          </>
        )}
        <div className="history-box" id="historia">
          <div className="history-head">
            <strong>Historia de la cita</strong>
            <span className="history-meta">Editable por roles con permiso</span>
          </div>
          <div className="history-grid">
            <div className="field">
              <label htmlFor="observaciones_clinicas">Observaciones clínicas</label>
              <textarea id="observaciones_clinicas" name="observaciones_clinicas" defaultValue={defaults.observaciones} placeholder="Observaciones clínicas..." />
            </div>
            <div className="field">
              <label htmlFor="acuerdos_tareas">Acuerdos / tareas</label>
              <textarea id="acuerdos_tareas" name="acuerdos_tareas" defaultValue={defaults.acuerdos} placeholder="Acuerdos y tareas..." />
            </div>
            <div className="field">
              <label htmlFor="incidencias">Incidencias</label>
              <textarea id="incidencias" name="incidencias" defaultValue={defaults.incidencias} placeholder="Incidencias relevantes..." />
            </div>
          </div>
          <input type="hidden" name="notas" value={defaults.observaciones} />
        </div>
        <div className="field col-2">
          <button className="btn primary" type="submit">{isEditing ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </div>
    </form>
  )
}

