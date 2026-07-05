'use client'

import { useState, useMemo } from 'react'
import { centsToEuros } from '@/lib/money'

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
}

type ViewMode = 'list' | 'month' | 'week'

function toDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  const date = toDate(dateStr)
  return date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getDayOfWeek(dateStr: string): number {
  return toDate(dateStr).getDay()
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
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return toISODate(date)
}

function CitaCard({ cita, canEdit }: { cita: Cita; canEdit: boolean }) {
  const pacientes = (cita.cita_pacientes || [])
    .map((row: any) => row.pacientes)
    .filter(Boolean)

  const nota = Array.isArray(cita.cita_notas)
    ? (cita.cita_notas[0]?.observaciones_clinicas || '')
    : (cita.cita_notas?.observaciones_clinicas || '')

  const isInPaidLiquidation = Boolean(cita.liquidacion_id)

  return (
    <div className="appt-card">
      <div>
        <strong>{cita.fecha}</strong>
        <div className="appt-time">
          {cita.hora_inicio} - {cita.hora_fin}
        </div>
      </div>
      <div>
        <div>{cita.servicios?.nombre ?? 'Servicio'} · {centsToEuros(cita.precio_cents)}</div>
        <div className="subtle">
          {pacientes.length > 0
            ? pacientes.map((p: Paciente) => p.codigo || `${p.nombre} ${p.apellidos}`.trim()).join(', ')
            : '—'}
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

function MonthView({ citas, canEdit, currentDate, onDateSelect }: { citas: Cita[]; canEdit: boolean; currentDate: string; onDateSelect: (date: string) => void }) {
  const monthStart = getMonthStart(currentDate)
  const date = toDate(monthStart)
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1))

  const citasByDate = new Map<string, Cita[]>()
  citas.forEach((cita) => {
    const key = cita.fecha
    if (!citasByDate.has(key)) citasByDate.set(key, [])
    citasByDate.get(key)!.push(cita)
  })

  const days: (Date | null)[] = []
  const current = new Date(startDate)
  while (days.length < 42) {
    if (current.getMonth() !== month && days.length >= 7) break
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab']

  return (
    <div>
      <div className="month-grid">
        {weekDays.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="month-day out"></div>
          const dateStr = toISODate(day)
          const daysCitas = citasByDate.get(dateStr) || []
          const isCurrentMonth = day.getMonth() === month
          const isToday = toISODate(new Date()) === dateStr

          return (
            <div key={dateStr} className={`month-day ${!isCurrentMonth ? 'out' : ''} ${isToday ? 'today' : ''}`}>
              <div className="day-head">
                <span className="day-number">{day.getDate()}</span>
              </div>
              <div className="day-events">
                {daysCitas.slice(0, 3).map((cita) => (
                  <a
                    key={cita.id}
                    href={`/calendario?editId=${cita.id}`}
                    className={`cal-event ${cita.estado}`}
                    title={`${cita.hora_inicio} - ${cita.servicios?.nombre || 'Cita'}`}
                  >
                    <span className="cal-event-time">{cita.hora_inicio}</span>
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

function WeekView({ citas, canEdit, currentDate }: { citas: Cita[]; canEdit: boolean; currentDate: string }) {
  const weekStart = getWeekStart(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const citasByDate = new Map<string, Cita[]>()
  citas.forEach((cita) => {
    const key = cita.fecha
    if (!citasByDate.has(key)) citasByDate.set(key, [])
    citasByDate.get(key)!.push(cita)
  })

  const hours = Array.from({ length: 16 }, (_, i) => i + 8) // 8:00 - 23:00

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: '1200px', fontSize: '12px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Hora</th>
            {days.map((day) => (
              <th key={day} style={{ width: '140px', textAlign: 'center' }}>
                <div>{formatDate(day)}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{day}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <td style={{ fontWeight: '600', textAlign: 'center', verticalAlign: 'top' }}>
                {String(hour).padStart(2, '0')}:00
              </td>
              {days.map((day) => {
                const daysCitas = citasByDate.get(day) || []
                const dayHourCitas = daysCitas.filter((cita) => {
                  const startHour = parseInt(cita.hora_inicio.split(':')[0])
                  return startHour === hour
                })

                return (
                  <td
                    key={`${day}-${hour}`}
                    style={{
                      verticalAlign: 'top',
                      borderRight: '1px solid #e0e0e0',
                      borderBottom: '1px solid #e0e0e0',
                      padding: '2px',
                      height: '60px',
                      overflow: 'hidden',
                    }}
                  >
                    {dayHourCitas.map((cita) => (
                      <a
                        key={cita.id}
                        href={`/calendario?editId=${cita.id}`}
                        className={`cal-event ${cita.estado}`}
                        style={{
                          display: 'block',
                          marginBottom: '2px',
                          textDecoration: 'none',
                          fontSize: '11px',
                          padding: '2px 4px',
                        }}
                      >
                        {cita.servicios?.nombre || 'Cita'} ({centsToEuros(cita.precio_cents)})
                      </a>
                    ))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CalendarViews({ citas, canEdit }: CalendarViewsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentDate, setCurrentDate] = useState(() => toISODate(new Date()))

  const sortedCitas = useMemo(() => {
    return [...citas].sort((a, b) => {
      const dateCompare = b.fecha.localeCompare(a.fecha)
      if (dateCompare !== 0) return dateCompare
      return b.hora_inicio.localeCompare(a.hora_inicio)
    })
  }, [citas])

  const nextMonth = () => {
    const date = toDate(currentDate)
    date.setMonth(date.getMonth() + 1)
    setCurrentDate(toISODate(date))
  }

  const prevMonth = () => {
    const date = toDate(currentDate)
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
      <div className="calendar-toolbar no-print" style={{ marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="view-toggle">
          <button
            className={`btn ${viewMode === 'list' ? 'primary' : 'soft'}`}
            type="button"
            onClick={() => setViewMode('list')}
          >
            Lista
          </button>
          <button
            className={`btn ${viewMode === 'month' ? 'primary' : 'soft'}`}
            type="button"
            onClick={() => setViewMode('month')}
          >
            Mes
          </button>
          <button
            className={`btn ${viewMode === 'week' ? 'primary' : 'soft'}`}
            type="button"
            onClick={() => setViewMode('week')}
          >
            Semana
          </button>
        </div>

        {viewMode === 'month' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button className="btn soft" type="button" onClick={prevMonth}>
              ← Anterior
            </button>
            <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '120px', textAlign: 'center' }}>
              {toDate(currentDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button className="btn soft" type="button" onClick={nextMonth}>
              Siguiente →
            </button>
          </div>
        )}

        {viewMode === 'week' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button className="btn soft" type="button" onClick={prevWeek}>
              ← Anterior
            </button>
            <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '180px', textAlign: 'center' }}>
              Semana de {getWeekStart(currentDate)}
            </span>
            <button className="btn soft" type="button" onClick={nextWeek}>
              Siguiente →
            </button>
          </div>
        )}

        <button className="btn soft" type="button" onClick={today}>
          Hoy
        </button>
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
      {viewMode === 'month' && <MonthView citas={sortedCitas} canEdit={canEdit} currentDate={currentDate} onDateSelect={setCurrentDate} />}
      {viewMode === 'week' && <WeekView citas={sortedCitas} canEdit={canEdit} currentDate={currentDate} />}
    </>
  )
}

