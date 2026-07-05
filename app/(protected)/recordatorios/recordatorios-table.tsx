'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type ReminderStatusKey = 'pendiente' | 'para_enviar' | 'enviado' | 'cancelada'
type ReminderView = 'pendientes' | 'para_enviar' | 'enviados' | 'cancelados' | 'todos'

type ReminderPatient = {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
}

type ReminderRow = {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  reminderStatus: string
  reminderDaysBefore: number
  reminderSentAt: string
  servicio: string
  colaboradorNombre: string
  colaboradorEmail: string
  supervisorNombre: string
  supervisorEmail: string
  pacientes: ReminderPatient[]
}

type ReminderFilters = {
  participantes: string
  destinatarios: string
  estado: '' | ReminderStatusKey
}

const initialFilters: ReminderFilters = {
  participantes: '',
  destinatarios: '',
  estado: '',
}

function normalizeSearch(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function fullName(nombre: string, apellidos?: string) {
  return `${nombre || ''} ${apellidos || ''}`.trim()
}

function formatDate(date: string) {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('es-ES')
}

function formatDateTime(date: Date | string) {
  const parsed = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function recipientsInfo(row: ReminderRow) {
  const recipients: Array<{ label: string; email: string }> = []
  let missing = 0

  row.pacientes.forEach((patient) => {
    if (patient.email) recipients.push({ label: patient.codigo || fullName(patient.nombre, patient.apellidos), email: patient.email })
    else missing += 1
  })

  if (row.colaboradorNombre) {
    if (row.colaboradorEmail) recipients.push({ label: 'Colaborador/a', email: row.colaboradorEmail })
    else missing += 1
  }

  if (row.supervisorNombre) {
    if (row.supervisorEmail) recipients.push({ label: 'Supervisor/a', email: row.supervisorEmail })
    else missing += 1
  }

  return { recipients, missing }
}

function participantsSearchText(row: ReminderRow) {
  return row.pacientes
    .map((patient) => `${patient.codigo || ''} ${fullName(patient.nombre, patient.apellidos)} ${patient.email || ''}`)
    .join(' ')
}

function recipientsSearchText(row: ReminderRow) {
  const patientPart = row.pacientes
    .map((patient) => `${patient.codigo || ''} ${fullName(patient.nombre, patient.apellidos)} ${patient.email || ''}`)
    .join(' ')

  return [
    patientPart,
    row.colaboradorNombre ? `Colaborador colaboradora ${row.colaboradorNombre} ${row.colaboradorEmail || ''}` : '',
    row.supervisorNombre ? `Supervisor supervisora ${row.supervisorNombre} ${row.supervisorEmail || ''}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function reminderDueDate(row: ReminderRow) {
  if (!row.fecha || !row.horaInicio) return null
  const iso = `${row.fecha}T${row.horaInicio}:00`
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return null
  due.setDate(due.getDate() - (Number(row.reminderDaysBefore || 0) || 0))
  return due
}

function reminderStatusKey(row: ReminderRow): ReminderStatusKey {
  if (row.estado === 'cancelada') return 'cancelada'
  if (row.reminderSentAt || row.reminderStatus === 'enviado') return 'enviado'
  const due = reminderDueDate(row)
  if (due && due.getTime() <= Date.now()) return 'para_enviar'
  return 'pendiente'
}

function reminderDueText(row: ReminderRow) {
  const due = reminderDueDate(row)
  if (!due) return 'Sin fecha de envío calculada'
  return `Enviar aprox.: ${formatDateTime(due)} (${Number(row.reminderDaysBefore || 0)} día/s antes)`
}

function reminderSubject(row: ReminderRow) {
  return `Recordatorio de cita · ${row.servicio || 'Servicio'}`
}

function reminderBody(row: ReminderRow) {
  const participants = row.pacientes.map((patient) => patient.codigo || fullName(patient.nombre, patient.apellidos)).join(', ') || 'paciente'
  const collaborator = row.colaboradorNombre || 'tu profesional'
  const supervisor = row.supervisorNombre ? ` · Supervisor/a: ${row.supervisorNombre}` : ''

  return [
    `Hola,`,
    '',
    `Te recordamos tu cita del ${formatDate(row.fecha)} a las ${row.horaInicio}${row.horaFin ? ` (${row.horaFin})` : ''}.`,
    `Servicio: ${row.servicio || 'Servicio'}`,
    `Participantes: ${participants}`,
    `Colaborador/a: ${collaborator}${supervisor}`,
  ].join('\n')
}

function statusBadge(row: ReminderRow) {
  const status = reminderStatusKey(row)

  if (status === 'cancelada') {
    return <span className="tag danger"><span className="reminder-status cancelled">Cancelada</span></span>
  }

  if (status === 'enviado') {
    return (
      <>
        <span className="tag ok"><span className="reminder-status sent">Enviado</span></span>
        <br />
        <span className="subtle">{formatDateTime(row.reminderSentAt)}</span>
      </>
    )
  }

  if (status === 'para_enviar') {
    return <span className="tag warn"><span className="reminder-status pending">Para enviar</span></span>
  }

  return <span className="tag"><span className="reminder-status pending">Pendiente</span></span>
}

function visibleRows(rows: ReminderRow[], view: ReminderView) {
  return rows.filter((row) => {
    const status = reminderStatusKey(row)

    if (view === 'pendientes') return status === 'pendiente' || status === 'para_enviar'
    if (view === 'para_enviar') return status === 'para_enviar'
    if (view === 'enviados') return status === 'enviado'
    if (view === 'cancelados') return status === 'cancelada'
    return true
  })
}

export function RecordatoriosTable({ rows }: { rows: ReminderRow[] }) {
  const [view, setView] = useState<ReminderView>('pendientes')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<ReminderFilters>(initialFilters)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || '').trim() !== ''),
    [filters],
  )

  const filteredRows = useMemo(() => {
    const queryParticipants = normalizeSearch(filters.participantes)
    const queryRecipients = normalizeSearch(filters.destinatarios)
    const baseView = filters.estado ? 'todos' : view

    return visibleRows(rows, baseView).filter((row) => {
      if (queryParticipants && !normalizeSearch(participantsSearchText(row)).includes(queryParticipants)) return false
      if (queryRecipients && !normalizeSearch(recipientsSearchText(row)).includes(queryRecipients)) return false
      return !filters.estado || reminderStatusKey(row) === filters.estado
    })
  }, [filters, rows, view])

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Recordatorios preparados</h3>
        <div className="button-line no-print">
          <span className="tag">{filteredRows.length}</span>
          <Link href="/configuracion" className="btn soft">Editar plantilla general</Link>
        </div>
      </div>

      <div className="compact-form reminder-filter-compact">
        <div className="field">
          <label htmlFor="reminder-view">Ver</label>
          <select id="reminder-view" value={view} onChange={(event) => setView(event.target.value as ReminderView)}>
            <option value="pendientes">Pendientes</option>
            <option value="para_enviar">Para enviar ya</option>
            <option value="enviados">Enviados</option>
            <option value="cancelados">Citas canceladas</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div className="reminder-rule-note">
          Regla por defecto: activa el recordatorio en nuevas citas y calcula cuándo toca enviarlo. En esta vista queda preparado para revisar, copiar y filtrar.
        </div>
      </div>

      <div className="no-print">
        <div
          className="patient-filter-bar"
          onClick={() => setFiltersOpen((current) => !current)}
          role="button"
          tabIndex={0}
          title="Abrir o cerrar filtros de recordatorios"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setFiltersOpen((current) => !current)
            }
          }}
        >
          <div className="patient-filter-bar-left">
            <span className="patient-filter-chevron">{filtersOpen ? '▲' : '▼'}</span>
            <span>Filtrar</span>
            {hasActiveFilters && <span className="patient-filter-active">Filtros activos</span>}
          </div>
          <div className="patient-filter-actions">
            <button
              type="button"
              className="btn soft"
              onClick={(event) => {
                event.stopPropagation()
                setFilters(initialFilters)
              }}
              disabled={!hasActiveFilters}
            >
              Borrar filtros
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="compact-form patient-list-filters">
            <div className="row">
              <div className="field col-4">
                <label htmlFor="reminder-filter-participantes">Participantes</label>
                <input
                  id="reminder-filter-participantes"
                  value={filters.participantes}
                  placeholder="Nombre, código o email"
                  onChange={(event) => setFilters((current) => ({ ...current, participantes: event.target.value }))}
                />
              </div>
              <div className="field col-4">
                <label htmlFor="reminder-filter-destinatarios">Destinatarios</label>
                <input
                  id="reminder-filter-destinatarios"
                  value={filters.destinatarios}
                  placeholder="Nombre o email"
                  onChange={(event) => setFilters((current) => ({ ...current, destinatarios: event.target.value }))}
                />
              </div>
              <div className="field col-4">
                <label htmlFor="reminder-filter-estado">Estado</label>
                <select
                  id="reminder-filter-estado"
                  value={filters.estado}
                  onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as ReminderFilters['estado'] }))}
                >
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="para_enviar">Para enviar</option>
                  <option value="enviado">Enviado</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="recordatorios-table">
          <thead>
            <tr>
              <th>Cita</th>
              <th>Participantes</th>
              <th>Destinatarios</th>
              <th>Recordatorio</th>
              <th>Estado</th>
              <th className="no-print">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && <tr><td colSpan={6} className="center muted">Sin recordatorios para mostrar</td></tr>}
            {filteredRows.map((row) => {
              const recipients = recipientsInfo(row)
              const participantsLabel = row.pacientes.map((patient) => patient.codigo || fullName(patient.nombre, patient.apellidos)).join(', ') || '—'
              const body = reminderBody(row)
              const subject = reminderSubject(row)
              const recipientEmails = recipients.recipients.map((recipient) => recipient.email).join(', ')

              return (
                <tr key={row.id}>
                  <td>
                    {formatDate(row.fecha)}
                    <br />
                    <span className="subtle">{row.horaInicio}-{row.horaFin} · {row.servicio || 'Servicio'}</span>
                    <br />
                    <span className="subtle">{row.colaboradorNombre || '—'} · {row.supervisorNombre || '—'}</span>
                  </td>
                  <td>
                    {participantsLabel}
                    <br />
                    <span className="subtle">{row.pacientes.length} participante/s</span>
                  </td>
                  <td>
                    {recipients.recipients.length > 0
                      ? recipients.recipients.map((recipient) => (
                          <span key={`${row.id}-${recipient.label}-${recipient.email}`} className="tag">{recipient.label} · {recipient.email}</span>
                        ))
                      : <span className="subtle">Sin destinatarios con email</span>}
                    {recipients.missing > 0 && (
                      <>
                        <br />
                        <span className="subtle danger-text">Faltan {recipients.missing} email/s</span>
                      </>
                    )}
                  </td>
                  <td>
                    <div className="subtle">{reminderDueText(row)}</div>
                    <div className="subtle"><strong>Asunto:</strong> {subject}</div>
                    <div className="reminder-preview">{body}</div>
                  </td>
                  <td>{statusBadge(row)}</td>
                  <td className="no-print">
                    <div className="button-line">
                      <Link href="/calendario" className="btn soft">Abrir calendario</Link>
                      <button className="btn soft" type="button" onClick={() => navigator.clipboard.writeText(recipientEmails || '')}>
                        Copiar email
                      </button>
                      <button className="btn soft" type="button" onClick={() => navigator.clipboard.writeText(body)}>
                        Copiar cuerpo
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}


