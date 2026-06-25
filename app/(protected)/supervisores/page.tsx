import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export default async function SupervisoresPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: supervisores } = await supabase
    .from('supervisores')
    .select('id,nombre,apellidos,email,activo')
    .order('nombre')

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Listado de supervisores</h3>
        <span className="tag">{supervisores?.length ?? 0}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {(supervisores ?? []).length === 0 && <tr><td colSpan={3} className="center muted">Sin datos</td></tr>}
            {(supervisores ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.nombre} {s.apellidos || ''}</td>
                <td>{s.email || '—'}</td>
                <td>{s.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
