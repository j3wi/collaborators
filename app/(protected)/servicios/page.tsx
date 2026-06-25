import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'
import { crearServicio, editarServicio, borrarServicio } from './actions'
import Link from 'next/link'

export default async function ServiciosPage({ searchParams }: { searchParams: Promise<{ editId?: string }> }) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor'
  const params = await searchParams
  const editId = params.editId || ''

  const { data: servicios } = await supabase
    .from('servicios')
    .select('id,nombre,precio_cents,duracion_min,activo')
    .order('nombre')

  const editing = editId ? (servicios ?? []).find((s: any) => s.id === editId) : null

  function euroInput(cents: number) {
    return ((cents || 0) / 100).toFixed(2).replace('.', ',')
  }

  return (
    <>
      {canEdit && (
        <section className="panel">
          <div className="panel-head">
            <h3>{editing ? 'Editar servicio' : 'Nuevo servicio'}</h3>
            {editing && <Link href="/servicios" className="btn soft">Cancelar</Link>}
          </div>
          <form className="compact-form" action={editing ? editarServicio : crearServicio}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="row">
              <div className="field col-5">
                <label>Nombre</label>
                <input name="nombre" defaultValue={editing?.nombre || ''} required />
              </div>
              <div className="field col-2">
                <label>Precio (€)</label>
                <input name="precio" inputMode="decimal" defaultValue={editing ? euroInput(editing.precio_cents) : '0,00'} required />
              </div>
              <div className="field col-2">
                <label>Duración/min</label>
                <input name="duracion_min" type="number" min={1} defaultValue={editing?.duracion_min || 60} required />
              </div>
              <div className="field col-2">
                <label>Estado</label>
                <select name="activo" defaultValue={editing ? String(editing.activo !== false) : 'true'}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="field col-1">
                <button className="btn primary" type="submit">Guardar</button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>Listado de servicios</h3>
          <span className="tag">{servicios?.length ?? 0}</span>
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
              {(servicios ?? []).length === 0 && <tr><td colSpan={canEdit ? 5 : 4} className="center muted">Sin datos</td></tr>}
              {(servicios ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td>{s.nombre}</td>
                  <td className="right">{centsToEuros(s.precio_cents)}</td>
                  <td className="right">{s.duracion_min} min</td>
                  <td>{s.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
                  {canEdit && (
                    <td className="no-print nowrap">
                      <div className="button-line">
                        <Link href={`/servicios?editId=${s.id}`} className="btn soft">Editar</Link>
                        <form action={borrarServicio} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={s.id} />
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
      </section>
    </>
  )
}
