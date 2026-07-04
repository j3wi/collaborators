import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearColaborador, editarColaborador, borrarColaborador, reenviarAccesoColaborador } from './actions'
import Link from 'next/link'

export default async function ColaboradoresPage({ searchParams }: { searchParams: Promise<{ editId?: string }> }) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor'
  const params = await searchParams
  const editId = params.editId || ''

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id,nombre,apellidos,email,dni,direccion,activo')
    .order('nombre')

  const editing = editId ? (colaboradores ?? []).find((c: any) => c.id === editId) : null

  return (
    <>
      {canEdit && (
        <section className="panel">
          <div className="panel-head">
            <h3>{editing ? 'Editar colaborador' : 'Nuevo colaborador'}</h3>
            {editing && <Link href="/colaboradores" className="btn soft">Cancelar</Link>}
          </div>
          <form className="compact-form" action={editing ? editarColaborador : crearColaborador}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="row">
              <div className="field col-2">
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
                <label>DNI</label>
                <input name="dni" defaultValue={editing?.dni || ''} />
              </div>
              <div className="field col-2">
                <label>Estado</label>
                <select name="activo" defaultValue={editing ? String(editing.activo !== false) : 'true'}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="field col-8">
                <label>Dirección</label>
                <input name="direccion" defaultValue={editing?.direccion || ''} />
              </div>
              <div className="field col-2">
                <button className="btn primary" type="submit">Guardar</button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>Listado de colaboradores</h3>
          <span className="tag">{colaboradores?.length ?? 0}</span>
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
              {(colaboradores ?? []).length === 0 && <tr><td colSpan={canEdit ? 6 : 5} className="center muted">Sin datos</td></tr>}
              {(colaboradores ?? []).map((c: any) => (
                <tr key={c.id}>
                  <td>{c.nombre} {c.apellidos || ''}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.dni || '—'}</td>
                  <td>{c.direccion || '—'}</td>
                  <td>{c.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
                  {canEdit && (
                    <td className="no-print nowrap">
                      <div className="button-line">
                        <Link href={`/colaboradores?editId=${c.id}`} className="btn soft">Editar</Link>
                        <form action={reenviarAccesoColaborador} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="btn soft" type="submit">Enviar acceso</button>
                        </form>
                        <form action={borrarColaborador} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={c.id} />
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
