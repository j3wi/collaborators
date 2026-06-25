import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'

export default async function ServiciosPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: servicios } = await supabase
    .from('servicios')
    .select('id,nombre,precio_cents,duracion_min,activo')
    .order('nombre')

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Listado de servicios</h3>
        <span className="tag">{servicios?.length ?? 0}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Servicio</th><th className="right">Precio</th><th className="right">Duración</th><th>Estado</th></tr></thead>
          <tbody>
            {(servicios ?? []).length === 0 && <tr><td colSpan={4} className="center muted">Sin datos</td></tr>}
            {(servicios ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td className="right">{centsToEuros(s.precio_cents)}</td>
                <td className="right">{s.duracion_min} min</td>
                <td>{s.activo !== false ? <span className="tag ok">Activo</span> : <span className="tag warn">Inactivo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
