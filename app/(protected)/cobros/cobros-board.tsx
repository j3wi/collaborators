'use client'

import { useMemo, useState } from 'react'
import { centsToEuros, calcLiquidacion } from '@/lib/money'

type ServerAction = (formData: FormData) => void | Promise<void>

type CitaRow = {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  precioCents: number
  estado: string
  pagoEstado: string
  liquidacionId: string
  colaboradorId: string
  supervisorId: string
  servicio: string
  colaboradorNombre: string
  supervisorNombre: string
  pacientes: Array<{
    id: string
    codigo: string
    nombre: string
    apellidos: string
  }>
}

type LiquidacionRow = {
  id: string
  numero: string
  periodoDesde: string
  periodoHasta: string
  colaboradorId: string
  supervisorId: string
  colaboradorNombre: string
  supervisorNombre: string
  subtotalCents: number
  irpfCents: number
  totalCents: number
  estado: string
  paymentDate: string
  paymentMethod: string
  citasCount: number
}

type FilterOption = { id: string; nombre: string }

type CobrosBoardProps = {
  citas: CitaRow[]
  liquidaciones: LiquidacionRow[]
  colaboradores: FilterOption[]
  supervisores: FilterOption[]
  lockColaboradorId: string
  canManage: boolean
  crearLiquidacionesAction: ServerAction
  actualizarCitasAction: ServerAction
  marcarLiquidacionPagadaAction: ServerAction
  marcarLiquidacionPendienteAction: ServerAction
  borrarLiquidacionAction: ServerAction
}

type CobrosFilters = {
  desde: string
  hasta: string
  colaboradorId: string
  supervisorId: string
  estadoCita: 'realizada' | 'programada' | 'no_canceladas' | 'todas'
  pago: 'pendiente' | 'pagada' | 'todas'
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    desde: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    hasta: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function getPreviousMonthRange() {
  const now = new Date()
  return {
    desde: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    hasta: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}

function buildInitialFilters(lockColaboradorId: string): CobrosFilters {
  const current = getCurrentMonthRange()
  return {
    ...current,
    colaboradorId: lockColaboradorId || '',
    supervisorId: '',
    estadoCita: 'realizada',
    pago: 'pendiente',
  }
}

export function CobrosBoard({
  citas,
  liquidaciones,
  colaboradores,
  supervisores,
  lockColaboradorId,
  canManage,
  crearLiquidacionesAction,
  actualizarCitasAction,
  marcarLiquidacionPagadaAction,
  marcarLiquidacionPendienteAction,
  borrarLiquidacionAction,
}: CobrosBoardProps) {
  const [filters, setFilters] = useState<CobrosFilters>(buildInitialFilters(lockColaboradorId))
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const liquidacionById = useMemo(() => {
    const map = new Map<string, LiquidacionRow>()
    liquidaciones.forEach((liquidacion) => {
      map.set(liquidacion.id, liquidacion)
    })
    return map
  }, [liquidaciones])

  const filteredRows = useMemo(() => {
    return citas
      .filter((cita) => {
        if (filters.estadoCita === 'realizada' && cita.estado !== 'realizada') return false
        if (filters.estadoCita === 'programada' && cita.estado !== 'programada') return false
        if (filters.estadoCita === 'no_canceladas' && cita.estado === 'cancelada') return false
        if (filters.desde && cita.fecha < filters.desde) return false
        if (filters.hasta && cita.fecha > filters.hasta) return false
        if (filters.colaboradorId && cita.colaboradorId !== filters.colaboradorId) return false
        if (filters.supervisorId && cita.supervisorId !== filters.supervisorId) return false
        if (filters.pago !== 'todas' && cita.pagoEstado !== filters.pago) return false
        return true
      })
      .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))
  }, [citas, filters])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedRows = useMemo(() => filteredRows.filter((row) => selectedSet.has(row.id)), [filteredRows, selectedSet])

  const baseRows = selectedRows.length > 0 ? selectedRows : filteredRows

  const eligibleVisibleRows = useMemo(
    () => filteredRows.filter((row) => row.pagoEstado !== 'pagada' && !row.liquidacionId),
    [filteredRows],
  )

  const eligibleSelectedRows = useMemo(
    () => selectedRows.filter((row) => row.pagoEstado !== 'pagada' && !row.liquidacionId),
    [selectedRows],
  )

  const totals = useMemo(() => {
    const calc = calcLiquidacion(baseRows.map((row) => row.precioCents), 15)
    const participantes = baseRows.reduce((sum, row) => sum + row.pacientes.length, 0)
    return {
      count: baseRows.length,
      participants: participantes,
      subtotal: calc.subtotal,
      irpf: calc.irpf,
      total: calc.total,
    }
  }, [baseRows])

  const summaryRows = useMemo(() => {
    const map = new Map<string, { nombre: string; citas: number; participantes: number; subtotal: number }>()
    baseRows.forEach((row) => {
      const key = row.colaboradorId || 'sin_colaborador'
      const current = map.get(key) || { nombre: row.colaboradorNombre || 'Sin colaborador', citas: 0, participantes: 0, subtotal: 0 }
      current.citas += 1
      current.participantes += row.pacientes.length
      current.subtotal += row.precioCents
      map.set(key, current)
    })

    return [...map.values()]
      .map((item) => {
        const calc = calcLiquidacion([item.subtotal], 15)
        return {
          ...item,
          irpf: calc.irpf,
          total: calc.total,
        }
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [baseRows])

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedSet.has(row.id))
  const pendingIds = eligibleVisibleRows.map((row) => row.id)
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedSet.has(id))

  const selectedLabel = selectedRows.length > 0
    ? `${selectedRows.length} seleccionada/s`
    : `${filteredRows.length} visible/s`

  function updateFilters(patch: Partial<CobrosFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setSelectedIds([])
  }

  function toggleSelection(ids: string[]) {
    if (ids.length === 0) return
    const isAllSelected = ids.every((id) => selectedSet.has(id))
    if (isAllSelected) {
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)))
      return
    }
    setSelectedIds((current) => [...new Set([...current, ...ids])])
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return [...new Set([...current, id])]
      return current.filter((item) => item !== id)
    })
  }

  function setCurrentMonth() {
    updateFilters(getCurrentMonthRange())
  }

  function setPreviousMonth() {
    updateFilters(getPreviousMonthRange())
  }

  function clearFilters() {
    updateFilters(buildInitialFilters(lockColaboradorId))
  }

  function exportVisibleCsv() {
    if (baseRows.length === 0) return
    const header = ['Fecha', 'Hora', 'Servicio', 'Colaborador', 'Supervisor', 'Participantes', 'Precio EUR', 'Estado', 'Pago']
    const lines = baseRows.map((row) => {
      const price = (row.precioCents / 100).toFixed(2)
      return [
        row.fecha,
        `${row.horaInicio}-${row.horaFin}`,
        row.servicio,
        row.colaboradorNombre,
        row.supervisorNombre,
        String(row.participantes),
        price,
        row.estado,
        row.pagoEstado,
      ]
    })

    const csv = [header, ...lines]
      .map((line) => line.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cobros_${filters.desde}_${filters.hasta}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>Filtros</h3>
          <span className="subtle">Los totales usan la seleccion. Si no seleccionas nada, usan todas las citas visibles.</span>
        </div>
        <div className="compact-form">
          <div className="row">
            <div className="field col-2">
              <label htmlFor="f-desde">Desde</label>
              <input id="f-desde" type="date" value={filters.desde} onChange={(event) => updateFilters({ desde: event.target.value })} />
            </div>
            <div className="field col-2">
              <label htmlFor="f-hasta">Hasta</label>
              <input id="f-hasta" type="date" value={filters.hasta} onChange={(event) => updateFilters({ hasta: event.target.value })} />
            </div>
            <div className="field col-2">
              <label htmlFor="f-colaborador">Colaborador</label>
              <select
                id="f-colaborador"
                value={filters.colaboradorId}
                onChange={(event) => updateFilters({ colaboradorId: event.target.value })}
                disabled={Boolean(lockColaboradorId)}
              >
                {!lockColaboradorId && <option value="">Todos</option>}
                {colaboradores.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>{colaborador.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field col-2">
              <label htmlFor="f-supervisor">Supervisor</label>
              <select id="f-supervisor" value={filters.supervisorId} onChange={(event) => updateFilters({ supervisorId: event.target.value })}>
                <option value="">Todos</option>
                {supervisores.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>{supervisor.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field col-2">
              <label htmlFor="f-estado-cita">Estado cita</label>
              <select
                id="f-estado-cita"
                value={filters.estadoCita}
                onChange={(event) => updateFilters({ estadoCita: event.target.value as CobrosFilters['estadoCita'] })}
              >
                <option value="realizada">Realizada</option>
                <option value="programada">Programada</option>
                <option value="no_canceladas">Programada + realizada</option>
                <option value="todas">Todas</option>
              </select>
            </div>
            <div className="field col-2">
              <label htmlFor="f-pago">Pago</label>
              <select id="f-pago" value={filters.pago} onChange={(event) => updateFilters({ pago: event.target.value as CobrosFilters['pago'] })}>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="todas">Todas</option>
              </select>
            </div>
          </div>
          <div className="button-line no-print">
            <button className="btn soft" type="button" onClick={setCurrentMonth}>Mes actual</button>
            <button className="btn soft" type="button" onClick={setPreviousMonth}>Mes anterior</button>
            <button className="btn" type="button" onClick={clearFilters}>Limpiar filtros</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Citas filtradas</h3>
          <div className="button-line no-print">
            <button className="btn soft" type="button" onClick={() => toggleSelection(filteredRows.map((row) => row.id))} disabled={filteredRows.length === 0}>
              {allVisibleSelected ? 'Desmarcar visibles' : 'Seleccionar visibles'}
            </button>
            <button className="btn soft" type="button" onClick={() => toggleSelection(pendingIds)} disabled={pendingIds.length === 0}>
              {allPendingSelected ? 'Desmarcar pendientes' : 'Seleccionar pendientes sin liquidar'}
            </button>
            <button className="btn" type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>Limpiar seleccion</button>
            {canManage && (
              <>
                <form action={crearLiquidacionesAction}>
                  <input type="hidden" name="cita_ids" value={selectedIds.join(',')} />
                  <input type="hidden" name="desde" value={filters.desde} />
                  <input type="hidden" name="hasta" value={filters.hasta} />
                  <button className="btn primary" type="submit" disabled={eligibleSelectedRows.length === 0}>Crear liquidacion</button>
                </form>

                <form action={actualizarCitasAction}>
                  <input type="hidden" name="cita_ids" value={selectedIds.join(',')} />
                  <input type="hidden" name="pago_estado" value="pagada" />
                  <button className="btn ok" type="submit" disabled={selectedIds.length === 0}>Marcar pagadas</button>
                </form>

                <form action={actualizarCitasAction}>
                  <input type="hidden" name="cita_ids" value={selectedIds.join(',')} />
                  <input type="hidden" name="pago_estado" value="pendiente" />
                  <button className="btn warn" type="submit" disabled={selectedIds.length === 0}>Marcar pendientes</button>
                </form>

                <form action={actualizarCitasAction}>
                  <input type="hidden" name="cita_ids" value={selectedIds.join(',')} />
                  <input type="hidden" name="estado" value="realizada" />
                  <button className="btn soft" type="submit" disabled={selectedIds.length === 0}>Marcar realizadas</button>
                </form>
              </>
            )}
            <button className="btn primary" type="button" onClick={exportVisibleCsv} disabled={baseRows.length === 0}>Exportar CSV</button>
          </div>
        </div>
        <div className="liquidation-strip">
          <span className="tag">{selectedLabel}</span>
          <span className="tag">{totals.count} cita/s</span>
          <span className="tag">{totals.participants} participante/s</span>
          <span className="tag">{eligibleSelectedRows.length} seleccionada/s disponible/s para liquidar</span>
          <span className="tag">{eligibleVisibleRows.length} visible/s pendiente/s sin liquidar</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="center no-print">Sel.</th>
                <th>Fecha</th>
                <th>Pacientes</th>
                <th>Servicio</th>
                <th>Colaborador</th>
                <th>Supervisor</th>
                <th className="right">Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && <tr><td colSpan={8} className="center muted">Sin citas para los filtros actuales</td></tr>}
              {filteredRows.map((row) => {
                const liq = row.liquidacionId ? liquidacionById.get(row.liquidacionId) : null
                return (
                  <tr key={row.id}>
                    <td className="center no-print">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(row.id)}
                        onChange={(event) => toggleOne(row.id, event.target.checked)}
                      />
                    </td>
                    <td>{row.fecha}<br /><span className="subtle">{row.horaInicio}-{row.horaFin}</span></td>
                    <td>
                      {row.pacientes.length === 0 ? '—' : row.pacientes.map((p) => p.codigo || `${p.nombre} ${p.apellidos}`.trim() || p.id).join(', ')}<br />
                      <span className="subtle">{row.pacientes.length} participante/s</span>
                    </td>
                    <td>{row.servicio || '—'}</td>
                    <td>{row.colaboradorNombre || '—'}</td>
                    <td>{row.supervisorNombre || '—'}</td>
                    <td className="right">{centsToEuros(row.precioCents)}</td>
                    <td>
                      {row.estado === 'realizada' ? <span className="tag ok">Realizada</span> : row.estado === 'programada' ? <span className="tag">Programada</span> : <span className="tag danger">Cancelada</span>}{' '}
                      {row.pagoEstado === 'pagada' ? <span className="tag ok">Pagada</span> : <span className="tag warn">Pendiente</span>}{' '}
                      {liq && <span className="tag warn">{liq.numero || 'Liquidada'}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <div className="total-pill"><span className="subtle">Subtotal {selectedRows.length ? 'seleccionado' : 'visible'}</span><strong>{centsToEuros(totals.subtotal)}</strong></div>
          <div className="total-pill"><span className="subtle">IRPF 15%</span><strong>{centsToEuros(totals.irpf)}</strong></div>
          <div className="total-pill"><span className="subtle">Total a facturar</span><strong>{centsToEuros(totals.total)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Resumen por colaborador</h3>
          <span className="subtle">Se calcula con {selectedRows.length ? 'la seleccion actual' : 'las citas visibles'}.</span>
        </div>
        <div className="table-wrap summary-table">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th className="right">Citas</th>
                <th className="right">Participantes</th>
                <th className="right">Subtotal</th>
                <th className="right">IRPF 15%</th>
                <th className="right">Total a facturar</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 && <tr><td colSpan={6} className="center muted">Sin datos</td></tr>}
              {summaryRows.map((row) => (
                <tr key={row.nombre}>
                  <td>{row.nombre}</td>
                  <td className="right">{row.citas}</td>
                  <td className="right">{row.participantes}</td>
                  <td className="right">{centsToEuros(row.subtotal)}</td>
                  <td className="right">{centsToEuros(row.irpf)}</td>
                  <td className="right"><strong>{centsToEuros(row.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Liquidaciones generadas</h3>
          <span className="tag">{liquidaciones.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Periodo</th>
                <th>Colaborador</th>
                <th>Supervisor</th>
                <th className="right">Citas</th>
                <th className="right">Subtotal</th>
                <th className="right">IRPF</th>
                <th className="right">Total</th>
                <th>Estado</th>
                {canManage && <th className="no-print">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {liquidaciones.length === 0 && <tr><td colSpan={canManage ? 10 : 9} className="center muted">Sin liquidaciones</td></tr>}
              {liquidaciones.map((row) => (
                <tr key={row.id}>
                  <td>{row.numero || '—'}</td>
                  <td>{row.periodoDesde} - {row.periodoHasta}</td>
                  <td>{row.colaboradorNombre || '—'}</td>
                  <td>{row.supervisorNombre || <span className="subtle">Varios / sin asignar</span>}</td>
                  <td className="right">{row.citasCount}</td>
                  <td className="right">{centsToEuros(row.subtotalCents)}</td>
                  <td className="right">{centsToEuros(row.irpfCents)}</td>
                  <td className="right"><strong>{centsToEuros(row.totalCents)}</strong></td>
                  <td>
                    {row.estado === 'pagada' ? <span className="tag ok">Pagada</span> : <span className="tag warn">Pendiente</span>}
                    {row.paymentDate && <><br /><span className="subtle">{row.paymentDate}{row.paymentMethod ? ` - ${row.paymentMethod}` : ''}</span></>}
                  </td>
                  {canManage && (
                    <td className="no-print nowrap">
                      <div className="button-line">
                        {row.estado === 'pagada' ? (
                          <form action={marcarLiquidacionPendienteAction}>
                            <input type="hidden" name="liquidacion_id" value={row.id} />
                            <button className="btn warn" type="submit">Deshacer pago</button>
                          </form>
                        ) : (
                          <form action={marcarLiquidacionPagadaAction}>
                            <input type="hidden" name="liquidacion_id" value={row.id} />
                            <input type="hidden" name="payment_date" value={toISODate(new Date())} />
                            <input type="hidden" name="payment_method" value="Transferencia" />
                            <button className="btn ok" type="submit">Marcar pagada</button>
                          </form>
                        )}

                        <form action={borrarLiquidacionAction}>
                          <input type="hidden" name="liquidacion_id" value={row.id} />
                          <button className="btn danger" type="submit" disabled={row.estado === 'pagada'}>Borrar</button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}


