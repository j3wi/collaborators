'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { borrarPaciente } from './actions'

type EstadoPaciente = 'activo' | 'inactivo'

type PacienteRow = {
  id: string
  codigo: string
  paciente: string
  email: string
  dni: string
  colaboradores: string
  supervisor: string
  estado: EstadoPaciente
}

type PatientFilters = {
  codigo: string
  paciente: string
  email: string
  dni: string
  colaborador: string
  supervisor: string
  estado: '' | EstadoPaciente
}

const initialFilters: PatientFilters = {
  codigo: '',
  paciente: '',
  email: '',
  dni: '',
  colaborador: '',
  supervisor: '',
  estado: '',
}

function normalizeSearch(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function PacientesTable({ pacientes, canEdit }: { pacientes: PacienteRow[]; canEdit: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<PatientFilters>(initialFilters)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || '').trim() !== ''),
    [filters],
  )

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((paciente) => {
      if (filters.codigo && !normalizeSearch(paciente.codigo).includes(normalizeSearch(filters.codigo))) return false
      if (filters.paciente && !normalizeSearch(paciente.paciente).includes(normalizeSearch(filters.paciente))) return false
      if (filters.email && !normalizeSearch(paciente.email).includes(normalizeSearch(filters.email))) return false
      if (filters.dni && !normalizeSearch(paciente.dni).includes(normalizeSearch(filters.dni))) return false
      if (filters.colaborador && !normalizeSearch(paciente.colaboradores).includes(normalizeSearch(filters.colaborador))) return false
      if (filters.supervisor && !normalizeSearch(paciente.supervisor).includes(normalizeSearch(filters.supervisor))) return false
      return !filters.estado || paciente.estado === filters.estado
    })
  }, [filters, pacientes])

  const totalLabel = filteredPacientes.length === pacientes.length
    ? String(pacientes.length)
    : `${filteredPacientes.length} / ${pacientes.length}`

  return (
    <>
      <div className="no-print">
        <div
          className="patient-filter-bar"
          onClick={() => setFiltersOpen((current) => !current)}
          role="button"
          tabIndex={0}
          title="Abrir o cerrar filtros de pacientes"
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
              <div className="field col-2">
                <label htmlFor="patient-filter-codigo">Código</label>
                <input
                  id="patient-filter-codigo"
                  value={filters.codigo}
                  placeholder="Filtrar"
                  onChange={(event) => setFilters((current) => ({ ...current, codigo: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-paciente">Paciente</label>
                <input
                  id="patient-filter-paciente"
                  value={filters.paciente}
                  placeholder="Nombre"
                  onChange={(event) => setFilters((current) => ({ ...current, paciente: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-email">Email</label>
                <input
                  id="patient-filter-email"
                  value={filters.email}
                  placeholder="Email"
                  onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-dni">DNI</label>
                <input
                  id="patient-filter-dni"
                  value={filters.dni}
                  placeholder="DNI"
                  onChange={(event) => setFilters((current) => ({ ...current, dni: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-colaborador">Colaborador/es</label>
                <input
                  id="patient-filter-colaborador"
                  value={filters.colaborador}
                  placeholder="Nombre"
                  onChange={(event) => setFilters((current) => ({ ...current, colaborador: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-supervisor">Supervisor</label>
                <input
                  id="patient-filter-supervisor"
                  value={filters.supervisor}
                  placeholder="Nombre"
                  onChange={(event) => setFilters((current) => ({ ...current, supervisor: event.target.value }))}
                />
              </div>
              <div className="field col-2">
                <label htmlFor="patient-filter-estado">Estado</label>
                <select
                  id="patient-filter-estado"
                  value={filters.estado}
                  onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as PatientFilters['estado'] }))}
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
        <h3>Listado de pacientes</h3>
        <div className="patient-list-summary">
          {hasActiveFilters && <span className="patient-filter-active">{filteredPacientes.length} resultado(s)</span>}
          <span className="tag">{totalLabel}</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Paciente</th><th>Email</th><th>DNI</th>
              <th>Colaborador/es</th><th>Supervisor</th><th>Estado</th>
              {canEdit && <th className="no-print">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPacientes.length === 0 && (
              <tr><td colSpan={canEdit ? 8 : 7} className="center muted">Sin datos</td></tr>
            )}
            {filteredPacientes.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.codigo || '—'}</td>
                <td>{paciente.paciente || '—'}</td>
                <td>{paciente.email || '—'}</td>
                <td>{paciente.dni || '—'}</td>
                <td>{paciente.colaboradores || '—'}</td>
                <td>{paciente.supervisor || '—'}</td>
                <td>
                  {paciente.estado === 'activo'
                    ? <span className="tag ok">Activo</span>
                    : <span className="tag warn">Inactivo</span>}
                </td>
                {canEdit && (
                  <td className="no-print nowrap">
                    <div className="button-line">
                      <Link href={`/pacientes?editId=${paciente.id}`} className="btn soft">Editar</Link>
                      <form action={borrarPaciente} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={paciente.id} />
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


