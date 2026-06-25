import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export default async function ColaboradoresPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id,nombre,apellidos,email,dni,direccion,activo')
    .order('nombre')

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Listado de colaboradores</h3>
        <span className="tag">{colaboradores?.length ?? 0}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>DNI</th><th>Dirección</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {(colaboradores ?? []).length === 0 && <tr><td colSpan={5} className="center muted">Sin datos</td></tr>}
            {(colaboradores ?? []).map((c: any) => (
              <tr key={c.id}>
                <td>{c.nombre} {c.apellidos || ''}</td>
                <td>{c.email || '—'}</td>
                <td>{c.dni || '—'}</td>
                <td>{c.direccion || '—'}</td>
                <td>{c.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
