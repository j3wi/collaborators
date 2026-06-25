import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'

export default async function PacientesPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor'

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id,codigo,nombre,apellidos,email,dni,activo')
    .order('codigo')

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>Listado de pacientes</h3>
          <span className="tag">{pacientes?.length ?? 0}</span>
        </div>
        {!canEdit && <div className="note">Tu usuario solo puede consultar los pacientes asignados.</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Paciente</th><th>Email</th><th>DNI</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(pacientes ?? []).length === 0 && (
                <tr><td colSpan={5} className="center muted">Sin datos</td></tr>
              )}
              {(pacientes ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.nombre} {p.apellidos || ''}</td>
                  <td>{p.email || '—'}</td>
                  <td>{p.dni || '—'}</td>
                  <td>{p.activo !== false
                    ? <span className="tag ok">Activo</span>
                    : <span className="tag warn">Inactivo</span>}
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
