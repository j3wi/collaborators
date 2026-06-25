import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearSupervisor, editarSupervisor, borrarSupervisor } from './actions'
import Link from 'next/link'

export default async function SupervisoresPage({ searchParams }: { searchParams: Promise<{ editId?: string }> }) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor'
  const params = await searchParams
  const editId = params.editId || ''

  if (!canEdit) {
    return <div className="note">No tienes permiso para esta sección.</div>
  }

  const { data: supervisores } = await supabase
    .from('supervisores')
    .select('id,nombre,apellidos,email,activo')
    .order('nombre')

  const editing = editId ? (supervisores ?? []).find((s: any) => s.id === editId) : null

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>{editing ? 'Editar supervisor' : 'Nuevo supervisor'}</h3>
          {editing && <Link href="/supervisores" className="btn soft">Cancelar</Link>}
        </div>
        <form className="compact-form" action={editing ? editarSupervisor : crearSupervisor}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="row">
            <div className="field col-3">
              <label>Nombre</label>
              <input name="nombre" defaultValue={editing?.nombre || ''} required />
            </div>
            <div className="field col-3">
              <label>Apellidos</label>
              <input name="apellidos" defaultValue={editing?.apellidos || ''} />
            </div>
            <div className="field col-3">
              <label>Email</label>
              <input name="email" type="email" defaultValue={editing?.email || ''} required />
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

      <section className="panel">
        <div className="panel-head">
          <h3>Listado de supervisores</h3>
          <span className="tag">{supervisores?.length ?? 0}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th className="no-print">Acciones</th></tr></thead>
            <tbody>
              {(supervisores ?? []).length === 0 && <tr><td colSpan={4} className="center muted">Sin datos</td></tr>}
              {(supervisores ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td>{s.nombre} {s.apellidos || ''}</td>
                  <td>{s.email || '—'}</td>
                  <td>{s.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
                  <td className="no-print nowrap">
                    <div className="button-line">
                      <Link href={`/supervisores?editId=${s.id}`} className="btn soft">Editar</Link>
                      <form action={borrarSupervisor} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn danger" type="submit">Borrar</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
