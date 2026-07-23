'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { borrarColaborador } from './actions'
import { EnviarAccesoForm } from './enviar-acceso-form'

type EstadoColaborador = 'activo' | 'inactivo'

type ColaboradorRow = {
  id: string
  nombre: string
  email: string
  dni: string
  direccion: string
  estado: EstadoColaborador
  citasCount: number
}

type CollaboratorFilters = {
  nombre: string
  email: string
  dni: string
  direccion: string
  estado: '' | EstadoColaborador
}

const initialFilters: CollaboratorFilters = {
  nombre: '',
  email: '',
  dni: '',
  direccion: '',
  estado: '',
}

function normalizeSearch(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function ColaboradoresTable({ colaboradores, canEdit }: { colaboradores: ColaboradorRow[]; canEdit: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<CollaboratorFilters>(initialFilters)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || '').trim() !== ''),
    [filters],
  )

  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((colaborador) => {
      if (filters.nombre && !normalizeSearch(colaborador.nombre).includes(normalizeSearch(filters.nombre))) return false
      if (filters.email && !normalizeSearch(colaborador.email).includes(normalizeSearch(filters.email))) return false
      if (filters.dni && !normalizeSearch(colaborador.dni).includes(normalizeSearch(filters.dni))) return false
      if (filters.direccion && !normalizeSearch(colaborador.direccion).includes(normalizeSearch(filters.direccion))) return false
      return !filters.estado || colaborador.estado === filters.estado
    })
  }, [colaboradores, filters])

  const totalLabel = filteredColaboradores.length === colaboradores.length
    ? String(colaboradores.length)
    : `${filteredColaboradores.length} / ${colaboradores.length}`

  return (
    <>
      <div className="no-print">
        <div
          className="patient-filter-bar"
          onClick={() => setFiltersOpen((current) => !current)}
          role="button"
          tabIndex={0}
          title="Abrir o cerrar filtros de colaboradores"
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
              <div className="field col-3">
                <label htmlFor="collaborator-filter-nombre">Nombre</label>
                <input
                  id="collaborator-filter-nombre"
                  value={filters.nombre}
                  placeholder="Nombre"
                  onChange={(event) => setFilters((current) => ({ ...current, nombre: event.target.value }))}
                />
              </div>
              <div className="field col-3">
                <label htmlFor="collaborator-filter-email">Email</label>
                <input
                  id="collaborator-filter-email"
                  value={filters.email}
                  placeholder="Email"
                  onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="collaborator-filter-dni">DNI</label>
                <input
                  id="collaborator-filter-dni"
                  value={filters.dni}
                  placeholder="DNI"
                  onChange={(event) => setFilters((current) => ({ ...current, dni: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="collaborator-filter-direccion">Dirección</label>
                <input
                  id="collaborator-filter-direccion"
                  value={filters.direccion}
                  placeholder="Dirección"
                  onChange={(event) => setFilters((current) => ({ ...current, direccion: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="collaborator-filter-estado">Estado</label>
                <select
                  id="collaborator-filter-estado"
                  value={filters.estado}
                  onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as CollaboratorFilters['estado'] }))}
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
        <h3>Listado de colaboradores</h3>
        <div className="patient-list-summary">
          {hasActiveFilters && <span className="patient-filter-active">{filteredColaboradores.length} resultado(s)</span>}
          <span className="tag">{totalLabel}</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Email</th><th>DNI</th><th>Dirección</th><th>Estado</th>
              {canEdit && <th className="no-print">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredColaboradores.length === 0 && (
              <tr><td colSpan={canEdit ? 6 : 5} className="center muted">Sin datos</td></tr>
            )}
            {filteredColaboradores.map((colaborador) => (
              <tr key={colaborador.id}>
                <td>{colaborador.nombre || '—'}</td>
                <td>{colaborador.email || '—'}</td>
                <td>{colaborador.dni || '—'}</td>
                <td>{colaborador.direccion || '—'}</td>
                <td>
                  {colaborador.estado === 'activo'
                    ? <span className="tag ok">Activo</span>
                    : <span className="tag warn">Inactivo</span>}
                </td>
                {canEdit && (
                  <td className="no-print nowrap">
                    <div className="button-line">
                      <Link href={`/colaboradores?editId=${colaborador.id}`} className="btn soft">Editar</Link>
                      <EnviarAccesoForm colaboradorId={colaborador.id} />
                      {colaborador.citasCount > 0 ? (
                        <button 
                          className="btn danger" 
                          type="button"
                          disabled
                          title={`No se puede borrar. Tiene ${colaborador.citasCount} cita${colaborador.citasCount !== 1 ? 's' : ''} asignada${colaborador.citasCount !== 1 ? 's' : ''}`}
                        >
                          Borrar ({colaborador.citasCount})
                        </button>
                      ) : (
                        <form action={borrarColaborador} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={colaborador.id} />
                          <button className="btn danger" type="submit">Borrar</button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

