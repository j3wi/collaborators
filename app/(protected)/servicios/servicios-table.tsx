'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { centsToEuros } from '@/lib/money'
import { borrarServicio } from './actions'

type EstadoServicio = 'activo' | 'inactivo'

type ServicioRow = {
  id: string
  nombre: string
  precioCents: number
  duracionMin: number
  estado: EstadoServicio
}

type ServiceFilters = {
  nombre: string
  precio: string
  duracion: string
  estado: '' | EstadoServicio
}

const initialFilters: ServiceFilters = {
  nombre: '',
  precio: '',
  duracion: '',
  estado: '',
}

function normalizeSearch(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function priceSearchText(precioCents: number) {
  const euros = (precioCents || 0) / 100
  return `${centsToEuros(precioCents)} ${euros.toFixed(2)} ${euros.toFixed(2).replace('.', ',')}`
}

export function ServiciosTable({ servicios, canEdit }: { servicios: ServicioRow[]; canEdit: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<ServiceFilters>(initialFilters)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || '').trim() !== ''),
    [filters],
  )

  const filteredServicios = useMemo(() => {
    return servicios.filter((servicio) => {
      if (filters.nombre && !normalizeSearch(servicio.nombre).includes(normalizeSearch(filters.nombre))) return false
      if (filters.precio && !normalizeSearch(priceSearchText(servicio.precioCents)).includes(normalizeSearch(filters.precio))) return false
      if (filters.duracion && !normalizeSearch(String(servicio.duracionMin)).includes(normalizeSearch(filters.duracion))) return false
      return !filters.estado || servicio.estado === filters.estado
    })
  }, [filters, servicios])

  const totalLabel = filteredServicios.length === servicios.length
    ? String(servicios.length)
    : `${filteredServicios.length} / ${servicios.length}`

  return (
    <>
      <div className="no-print">
        <div
          className="patient-filter-bar"
          onClick={() => setFiltersOpen((current) => !current)}
          role="button"
          tabIndex={0}
          title="Abrir o cerrar filtros de servicios"
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
                <label htmlFor="service-filter-nombre">Servicio</label>
                <input
                  id="service-filter-nombre"
                  value={filters.nombre}
                  placeholder="Servicio"
                  onChange={(event) => setFilters((current) => ({ ...current, nombre: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="service-filter-precio">Precio</label>
                <input
                  id="service-filter-precio"
                  value={filters.precio}
                  placeholder="Precio"
                  onChange={(event) => setFilters((current) => ({ ...current, precio: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="service-filter-duracion">Duración</label>
                <input
                  id="service-filter-duracion"
                  value={filters.duracion}
                  placeholder="Minutos"
                  onChange={(event) => setFilters((current) => ({ ...current, duracion: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="service-filter-estado">Estado</label>
                <select
                  id="service-filter-estado"
                  value={filters.estado}
                  onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as ServiceFilters['estado'] }))}
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
        <h3>Listado de servicios</h3>
        <div className="patient-list-summary">
          {hasActiveFilters && <span className="patient-filter-active">{filteredServicios.length} resultado(s)</span>}
          <span className="tag">{totalLabel}</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th className="right">Precio</th>
              <th className="right">Duración</th>
              <th>Estado</th>
              {canEdit && <th className="no-print">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredServicios.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} className="center muted">Sin datos</td></tr>}
            {filteredServicios.map((servicio) => (
              <tr key={servicio.id}>
                <td>{servicio.nombre || '—'}</td>
                <td className="right">{centsToEuros(servicio.precioCents)}</td>
                <td className="right">{servicio.duracionMin} min</td>
                <td>{servicio.estado === 'activo' ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
                {canEdit && (
                  <td className="no-print nowrap">
                    <div className="button-line">
                      <Link href={`/servicios?editId=${servicio.id}`} className="btn soft">Editar</Link>
                      <form action={borrarServicio} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={servicio.id} />
                        <button className="btn danger" type="submit">Borrar</button>
                      </form>
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


