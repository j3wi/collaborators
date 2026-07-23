'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { reenviarAccesoSupervisor } from './actions'
import { ConfirmarBorradoModal } from './confirmar-borrado-modal'

type EstadoSupervisor = 'activo' | 'inactivo'

type SupervisorRow = {
  id: string
  nombre: string
  email: string
  estado: EstadoSupervisor
  citasCount: number
}

type SupervisorFilters = {
  nombre: string
  email: string
  estado: '' | EstadoSupervisor
}

const initialFilters: SupervisorFilters = {
  nombre: '',
  email: '',
  estado: '',
}

function normalizeSearch(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function SupervisoresTable({ supervisores }: { supervisores: SupervisorRow[] }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<SupervisorFilters>(initialFilters)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || '').trim() !== ''),
    [filters],
  )

  const filteredSupervisores = useMemo(() => {
    return supervisores.filter((supervisor) => {
      if (filters.nombre && !normalizeSearch(supervisor.nombre).includes(normalizeSearch(filters.nombre))) return false
      if (filters.email && !normalizeSearch(supervisor.email).includes(normalizeSearch(filters.email))) return false
      return !filters.estado || supervisor.estado === filters.estado
    })
  }, [filters, supervisores])

  const totalLabel = filteredSupervisores.length === supervisores.length
    ? String(supervisores.length)
    : `${filteredSupervisores.length} / ${supervisores.length}`

  return (
    <>
      <div className="no-print">
        <div
          className="patient-filter-bar"
          onClick={() => setFiltersOpen((current) => !current)}
          role="button"
          tabIndex={0}
          title="Abrir o cerrar filtros de supervisores"
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
                <label htmlFor="supervisor-filter-nombre">Nombre</label>
                <input
                  id="supervisor-filter-nombre"
                  value={filters.nombre}
                  placeholder="Nombre"
                  onChange={(event) => setFilters((current) => ({ ...current, nombre: event.target.value }))}
                />
              </div>
              <div className="field col-4">
                <label htmlFor="supervisor-filter-email">Email</label>
                <input
                  id="supervisor-filter-email"
                  value={filters.email}
                  placeholder="Email"
                  onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="field col-4">
                <label htmlFor="supervisor-filter-estado">Estado</label>
                <select
                  id="supervisor-filter-estado"
                  value={filters.estado}
                  onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as SupervisorFilters['estado'] }))}
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel-head">
        <h3>Listado de supervisores</h3>
        <div className="patient-list-summary">
          {hasActiveFilters && <span className="patient-filter-active">{filteredSupervisores.length} resultado(s)</span>}
          <span className="tag">{totalLabel}</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Estado</th><th className="no-print">Acciones</th></tr>
          </thead>
          <tbody>
            {filteredSupervisores.length === 0 && <tr><td colSpan={4} className="center muted">Sin datos</td></tr>}
            {filteredSupervisores.map((supervisor) => (
              <tr key={supervisor.id}>
                <td>{supervisor.nombre || '—'}</td>
                <td>{supervisor.email || '—'}</td>
                <td>
                  {supervisor.estado === 'activo'
                    ? <span className="tag ok">Activo</span>
                    : <span className="tag warn">Inactivo</span>}
                </td>
                <td className="no-print nowrap">
                  <div className="button-line">
                    <Link href={`/supervisores?editId=${supervisor.id}`} className="btn soft">Editar</Link>
                    <form action={reenviarAccesoSupervisor} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={supervisor.id} />
                      <button className="btn soft" type="submit">Enviar acceso</button>
                    </form>
                    <ConfirmarBorradoModal
                      supervisorId={supervisor.id}
                      supervisorNombre={supervisor.nombre}
                      citasCount={supervisor.citasCount}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

