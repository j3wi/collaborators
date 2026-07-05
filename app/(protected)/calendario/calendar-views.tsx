'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { centsToEuros } from '@/lib/money'
import { moverCitaSemana } from './actions'

type Paciente = {
  id: string
  codigo: string
  nombre: string
  apellidos: string
}

type Cita = {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  pago_estado: string
  precio_cents: number
  reminder_enabled: boolean
  reminder_days_before: number
  liquidacion_id: string | null
  colaborador_id: string
  supervisor_id: string | null
  servicios: { id: string; nombre: string } | null
  colaboradores: { id: string; nombre: string; apellidos: string } | null
  supervisores: { id: string; nombre: string; apellidos: string } | null
  cita_pacientes: Array<{ pacientes: Paciente }>
  cita_notas?: Array<{
    observaciones_clinicas?: string | null
    acuerdos_tareas?: string | null
    incidencias?: string | null
    last_edited_at?: string | null
    last_edited_by?: string | null
  }> | { observaciones_clinicas?: string | null }
}

type CalendarViewsProps = {
  citas: Cita[]
  canEdit: boolean
  initialView?: ViewMode
  initialDate?: string
}

type ViewMode = 'list' | 'month' | 'week'

type ContextMenuState = {
  x: number
  y: number
  citaId: string
}

const CONTEXT_MENU_WIDTH = 210
const CONTEXT_MENU_HEIGHT = 190

function toDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(dateStr: string): string {
  const date = toDate(dateStr)
  return date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const [h, m] = raw.split(':')
  if (h === undefined || m === undefined) return raw
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const date = toDate(dateStr)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function subtractDays(dateStr: string, days: number): string {
  const date = toDate(dateStr)
  date.setDate(date.getDate() - days)
  return toISODate(date)
}

function getMonthStart(dateStr: string): string {
  const date = toDate(dateStr)
  date.setDate(1)
  return toISODate(date)
}

function getWeekStart(dateStr: string): string {
  const date = toDate(dateStr)
  const mondayIndex = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - mondayIndex)
  return toISODate(date)
}

function timeToMinutes(value: string): number | null {
  const parts = String(value || '').split(':').map(Number)
  const h = parts[0]
  const m = parts[1] || 0
  if (!Number.isFinite(h)) return null
  return h * 60 + m
}

function appointmentStartHour(cita: Cita): number {
  const raw = String(cita.hora_inicio || '').trim()
  const hour = Number(raw.split(':')[0])
  return Number.isFinite(hour) ? hour : -1
}

function appointmentStartQuarterIndex(cita: Cita): number {
  const minutes = timeToMinutes(cita.hora_inicio)
  if (minutes === null) return 0
  return Math.max(0, Math.min(3, Math.floor((minutes % 60) / 15)))
}

function appointmentDurationSlots(cita: Cita): number {
  const start = timeToMinutes(cita.hora_inicio)
  const end = timeToMinutes(cita.hora_fin)
  if (start === null || end === null || end <= start) return 1
  return Math.max(1, Math.ceil((end - start) / 15))
}

function CitaCard({ cita, canEdit }: { cita: Cita; canEdit: boolean }) {
  const pacientes = (cita.cita_pacientes || [])
    .map((row: any) => row.pacientes)
    .filter(Boolean)
  const participantesText = pacientes.length > 0
    ? pacientes.map((p: Paciente) => p.codigo || `${p.nombre} ${p.apellidos}`.trim()).join(', ')
    : 'Sin participante'

  const nota = Array.isArray(cita.cita_notas)
    ? (cita.cita_notas[0]?.observaciones_clinicas || '')
    : (cita.cita_notas?.observaciones_clinicas || '')

  const isInPaidLiquidation = Boolean(cita.liquidacion_id)

  return (
    <div className="appt-card">
      <div>
        <strong>{cita.fecha}</strong>
        <div className="appt-time">
          {formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)}
        </div>
      </div>
      <div>
        <div>{cita.servicios?.nombre ?? 'Servicio'} · {centsToEuros(cita.precio_cents)}</div>
        <div className="subtle">
          {participantesText}
        </div>
        <div className="subtle">
          {cita.colaboradores ? `${cita.colaboradores.nombre} ${cita.colaboradores.apellidos || ''}` : '—'}
          {cita.supervisores ? ` · ${cita.supervisores.nombre} ${cita.supervisores.apellidos || ''}` : ''}
          {' · '}
          {cita.estado === 'realizada'
            ? <span className="ok-text">Realizada</span>
            : cita.estado === 'cancelada'
            ? <span className="tag danger">Cancelada</span>
            : <span>{cita.estado}</span>}
          {' · '}
          {cita.pago_estado === 'pagada'
            ? <span className="tag ok">Pagada</span>
            : <span className="tag warn">Pendiente</span>}
          {cita.liquidacion_id && <span className="tag warn">Liquidada</span>}
        </div>
        {nota && (
          <div className="note" style={{ marginTop: '6px' }}>
            {nota}
          </div>
        )}
        {cita.reminder_enabled && <div className="subtle">Recordatorio en {cita.reminder_days_before} días</div>}
      </div>
      <div className="button-line no-print">
        {canEdit && (
          <>
            <a href={`/calendario?editId=${cita.id}`} className="btn soft">
              {isInPaidLiquidation ? 'Abrir' : 'Editar'}
            </a>
          </>
        )}
      </div>
    </div>
  )
}

function ListaView({ citas, canEdit }: { citas: Cita[]; canEdit: boolean }) {
  return (
    <div className="calendar-list">
      {citas.length === 0 && <div className="note">No hay citas para mostrar.</div>}
      {citas.map((cita) => (
        <CitaCard key={cita.id} cita={cita} canEdit={canEdit} />
      ))}
    </div>
  )
}

function MonthView({
  citas,
  currentDate,
  canEdit,
  onContextMenuOpen,
}: {
  citas: Cita[]
  currentDate: string
  canEdit: boolean
  onContextMenuOpen: (event: React.MouseEvent, citaId: string) => void
}) {
  const monthStart = getMonthStart(currentDate)
  const date = toDate(monthStart)
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  const mondayIndex = (firstDay.getDay() + 6) % 7
  startDate.setDate(startDate.getDate() - mondayIndex)

  const citasByDate = new Map<string, Cita[]>()
  citas.forEach((cita) => {
    const key = cita.fecha
    if (!citasByDate.has(key)) citasByDate.set(key, [])
    citasByDate.get(key)!.push(cita)
  })

  const days: Date[] = []
  const current = new Date(startDate)
  while (days.length < 42) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

  return (
    <div>
      <div className="month-grid">
        {weekDays.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dateStr = toISODate(day)
          const daysCitas = citasByDate.get(dateStr) || []
          const isCurrentMonth = day.getMonth() === month
          const isToday = toISODate(new Date()) === dateStr

          return (
            <div key={dateStr} className={`month-day ${!isCurrentMonth ? 'out' : ''} ${isToday ? 'today' : ''}`}>
              <div className="day-head">
                <span className="day-number">{day.getDate()}</span>
                <a href={`/calendario?new=1&createDate=${dateStr}&view=month&currentDate=${currentDate}`} className="mini-add" title="Nueva cita este dia">+</a>
              </div>
              <div className="day-events">
                {daysCitas.slice(0, 3).map((cita) => (
                  <a
                    key={cita.id}
                    href={`/calendario?editId=${cita.id}`}
                    className={`cal-event ${cita.estado}`}
                    title={`${cita.hora_inicio} - ${cita.servicios?.nombre || 'Cita'}`}
                    onContextMenu={(event) => {
                      if (!canEdit) return
                      onContextMenuOpen(event, cita.id)
                    }}
                  >
                    <span className="cal-event-time">{formatTime(cita.hora_inicio)}</span>
                    <span className="cal-event-text">{cita.servicios?.nombre || '...'}</span>
                  </a>
                ))}
                {daysCitas.length > 3 && (
                  <div className="cal-more">+{daysCitas.length - 3} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  citas,
  currentDate,
  onContextMenuOpen,
}: {
  citas: Cita[]
  currentDate: string
  onContextMenuOpen: (event: React.MouseEvent, citaId: string) => void
}) {
  const [draggedCitaId, setDraggedCitaId] = useState<string | null>(null)
  const [dragClickGuard, setDragClickGuard] = useState(false)

  const weekStart = getWeekStart(currentDate)
  const todayIso = toISODate(new Date())
  const hours = Array.from({ length: 16 }, (_, i) => i + 8)
  const quarters = [0, 15, 30, 45]

  const citasByDay = new Map<string, Cita[]>()
  citas.forEach((cita) => {
    const key = cita.fecha
    if (!citasByDay.has(key)) citasByDay.set(key, [])
    citasByDay.get(key)!.push(cita)
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(weekStart, i)
    const d = toDate(iso)
    return {
      d,
      iso,
      isWeekend: i >= 5,
      isToday: iso === todayIso,
      citas: (citasByDay.get(iso) || []).slice().sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')),
    }
  })

  return (
    <div className="week-schedule-wrap">
      <div className="week-schedule">
        <div className="week-corner"></div>
        {days.map((day) => (
          <div key={day.iso} className={`week-day-slot ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''}`}>
            <div className="week-day-title">
              <span className="week-day-name">{day.d.toLocaleDateString('es-ES', { weekday: 'long' })}</span>
              <span className="week-day-number">{day.d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={`row-${hour}`}>
            <div key={`label-${hour}`} className="week-hour-label">{`${String(hour).padStart(2, '0')}:00`}</div>
            {days.map((day) => {
              const hourEvents = day.citas.filter((cita) => appointmentStartHour(cita) === hour)
              return (
                <div key={`${day.iso}-${hour}`} className={`week-hour-cell ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''}`}>
                  {quarters.map((minute) => {
                    const slotTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                    return (
                      <a
                        key={`${day.iso}-${hour}-${minute}`}
                        className="week-quarter-slot"
                        data-time={slotTime}
                        href={`/calendario?new=1&createDate=${day.iso}&createTime=${slotTime}&view=week&currentDate=${currentDate}`}
                        title={`Crear cita ${formatDate(day.iso)} ${slotTime}`}
                        aria-label={`Crear cita ${day.iso} ${slotTime}`}
                        onDragOver={(event) => {
                          if (!draggedCitaId) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDragEnter={(event) => {
                          if (!draggedCitaId) return
                          event.preventDefault()
                          event.currentTarget.classList.add('drop-ready')
                        }}
                        onDragLeave={(event) => {
                          event.currentTarget.classList.remove('drop-ready')
                        }}
                        onDrop={async (event) => {
                          if (!draggedCitaId) return
                          event.preventDefault()
                          event.stopPropagation()
                          event.currentTarget.classList.remove('drop-ready')
                          try {
                            if (!window.confirm(`Mover cita al ${formatDate(day.iso)} ${slotTime}?`)) return
                            await moverCitaSemana(draggedCitaId, day.iso, slotTime)
                          } catch (error) {
                            const message = error instanceof Error ? error.message : 'No se pudo mover la cita'
                            window.alert(message)
                          } finally {
                            setDraggedCitaId(null)
                            setTimeout(() => setDragClickGuard(false), 160)
                          }
                        }}
                      />
                    )
                  })}

                  {hourEvents.map((cita, index) => {
                    const startQuarter = appointmentStartQuarterIndex(cita)
                    const durationSlots = appointmentDurationSlots(cita)
                    const top = startQuarter * 25
                    const height = Math.max(20, durationSlots * 25)
                    const safeTotal = Math.max(1, hourEvents.length)
                    const width = 100 / safeTotal
                    const left = index * width
                    const nota = Array.isArray(cita.cita_notas)
                      ? (cita.cita_notas[0]?.observaciones_clinicas || '')
                      : (cita.cita_notas?.observaciones_clinicas || '')
                    const noteLabel = nota ? ' · notas' : ''
                    const participantes = (cita.cita_pacientes || [])
                      .map((row: any) => row.pacientes)
                      .filter(Boolean)
                      .map((p: Paciente) => p.codigo || `${p.nombre} ${p.apellidos}`.trim())
                      .join(', ') || 'Sin participante'
                    const classes = ['week-event-overlay']
                    if (cita.estado === 'realizada') classes.push('realizada')
                    if (cita.estado === 'cancelada') classes.push('cancelada')
                    if (cita.pago_estado === 'pagada') classes.push('pagada')

                    return (
                      <a
                        key={cita.id}
                        href={`/calendario?editId=${cita.id}`}
                        className={classes.join(' ')}
                        draggable
                        onClick={(event) => {
                          if (dragClickGuard) event.preventDefault()
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          onContextMenuOpen(event, cita.id)
                        }}
                        onDragStart={(event) => {
                          setDraggedCitaId(cita.id)
                          setDragClickGuard(true)
                          event.currentTarget.classList.add('dragging')
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', cita.id)
                        }}
                        onDragEnd={(event) => {
                          event.currentTarget.classList.remove('dragging')
                          setDraggedCitaId(null)
                          document.querySelectorAll('.week-quarter-slot.drop-ready').forEach((el) => el.classList.remove('drop-ready'))
                          setTimeout(() => setDragClickGuard(false), 160)
                        }}
                        style={{
                          top: `calc(${top}% + 2px)`,
                          height: `calc(${height}% - 4px)`,
                          left: `calc(${left}% + 3px)`,
                          width: `calc(${width}% - 6px)`,
                          zIndex: 2,
                        }}
                        title={`${formatDate(cita.fecha)} ${formatTime(cita.hora_inicio)}-${formatTime(cita.hora_fin)} · ${participantes} · ${cita.servicios?.nombre || 'Servicio'}${noteLabel} · ${centsToEuros(cita.precio_cents)}`}
                      >
                        <span className="cal-event-time">{formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)} · {participantes}</span>
                        <span className="cal-event-text">{(cita.servicios?.nombre || 'Servicio') + noteLabel}</span>
                      </a>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function CalendarViews({ citas, canEdit, initialView = 'list', initialDate = '' }: CalendarViewsProps) {
  const safeInitialView: ViewMode = initialView === 'month' || initialView === 'week' || initialView === 'list' ? initialView : 'list'
  const [viewMode, setViewMode] = useState<ViewMode>(safeInitialView)
  const [currentDate, setCurrentDate] = useState(() => initialDate || toISODate(new Date()))
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onEsc)
    }
  }, [contextMenu])

  function openContextMenu(event: React.MouseEvent, citaId: string) {
    event.preventDefault()
    const maxX = window.innerWidth - CONTEXT_MENU_WIDTH - 12
    const maxY = window.innerHeight - CONTEXT_MENU_HEIGHT - 12
    const x = Math.max(8, Math.min(event.clientX, maxX))
    const y = Math.max(8, Math.min(event.clientY, maxY))
    setContextMenu({ x, y, citaId })
  }

  function goToContextAction(action: 'editar' | 'historia' | 'repetir' | 'borrar') {
    if (!contextMenu) return
    const hash = action === 'editar' ? '' : `#${action}`
    window.location.assign(`/calendario?editId=${contextMenu.citaId}&view=${viewMode}&currentDate=${currentDate}${hash}`)
  }

  const sortedCitas = useMemo(() => {
    return [...citas].sort((a, b) => {
      const dateCompare = b.fecha.localeCompare(a.fecha)
      if (dateCompare !== 0) return dateCompare
      return b.hora_inicio.localeCompare(a.hora_inicio)
    })
  }, [citas])

  const nextMonth = () => {
    const date = toDate(currentDate)
    date.setDate(1)
    date.setMonth(date.getMonth() + 1)
    setCurrentDate(toISODate(date))
  }

  const prevMonth = () => {
    const date = toDate(currentDate)
    date.setDate(1)
    date.setMonth(date.getMonth() - 1)
    setCurrentDate(toISODate(date))
  }

  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7))
  }

  const prevWeek = () => {
    setCurrentDate(subtractDays(currentDate, 7))
  }

  const today = () => {
    setCurrentDate(toISODate(new Date()))
  }

  return (
    <>
      <div className="calendar-toolbar no-print" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {viewMode === 'month' && (
            <>
              <button className="btn soft" type="button" onClick={prevMonth}>← Anterior</button>
              <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '140px', textAlign: 'center' }}>
                {toDate(currentDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button className="btn soft" type="button" onClick={nextMonth}>Siguiente →</button>
            </>
          )}

          {viewMode === 'week' && (
            <>
              <button className="btn soft" type="button" onClick={prevWeek}>← Anterior</button>
              <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '180px', textAlign: 'center' }}>
                Semana de {getWeekStart(currentDate)}
              </span>
              <button className="btn soft" type="button" onClick={nextWeek}>Siguiente →</button>
            </>
          )}

          <button className="btn soft" type="button" onClick={today}>Hoy</button>
        </div>

        <div className="view-toggle" style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a className="btn primary" href={`/calendario?new=1&createDate=${currentDate}&view=${viewMode}&currentDate=${currentDate}`}>
            Nueva cita
          </a>
          <button className={`btn ${viewMode === 'month' ? 'primary' : 'soft'}`} type="button" onClick={() => setViewMode('month')}>
            Vista mensual
          </button>
          <button className={`btn ${viewMode === 'week' ? 'primary' : 'soft'}`} type="button" onClick={() => setViewMode('week')}>
            Vista semanal
          </button>
          <button className={`btn ${viewMode === 'list' ? 'primary' : 'soft'}`} type="button" onClick={() => setViewMode('list')}>
            Lista
          </button>
        </div>
      </div>

      <div className="calendar-legend subtle">
        <span>
          <i className="legend-dot"></i> Programada
        </span>
        <span>
          <i className="legend-dot realizada"></i> Realizada
        </span>
        <span>
          <i className="legend-dot pagada"></i> Pagada
        </span>
        <span>
          <i className="legend-dot cancelada"></i> Cancelada
        </span>
      </div>

      {viewMode === 'list' && <ListaView citas={sortedCitas} canEdit={canEdit} />}
      {viewMode === 'month' && <MonthView citas={sortedCitas} currentDate={currentDate} canEdit={canEdit} onContextMenuOpen={openContextMenu} />}
      {viewMode === 'week' && <WeekView citas={sortedCitas} currentDate={currentDate} onContextMenuOpen={openContextMenu} />}

      {canEdit && contextMenu && (
        <div
          className="details-box no-print"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999, width: '190px' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="panel-head" style={{ marginBottom: '6px' }}>
            <h3 style={{ fontSize: '13px' }}>Acciones cita</h3>
            <button type="button" className="btn soft" onClick={() => setContextMenu(null)}>x</button>
          </div>
          <div className="button-line" style={{ display: 'grid', gap: '6px' }}>
            <button type="button" className="btn soft" onClick={() => goToContextAction('editar')}>Editar</button>
            <button type="button" className="btn soft" onClick={() => goToContextAction('historia')}>Historia</button>
            <button type="button" className="btn soft" onClick={() => goToContextAction('repetir')}>Repetir</button>
            <button type="button" className="btn danger" onClick={() => goToContextAction('borrar')}>Borrar</button>
          </div>
        </div>
      )}
    </>
  )
}

