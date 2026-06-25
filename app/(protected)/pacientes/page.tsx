import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearPaciente, editarPaciente, borrarPaciente } from './actions'
import Link from 'next/link'

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ editId?: string }> }) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const canEdit = profile.role === 'admin' || profile.role === 'supervisor'
  const params = await searchParams
  const editId = params.editId || ''

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id,codigo,nombre,apellidos,email,dni,activo')
    .order('codigo')

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id,nombre,apellidos')
    .eq('activo', true)
    .order('nombre')

  const { data: supervisores } = await supabase
    .from('supervisores')
    .select('id,nombre,apellidos')
    .eq('activo', true)
    .order('nombre')

  // Obtener asignaciones de colaborador-paciente
  const { data: asignaciones } = await supabase
    .from('paciente_colaborador')
    .select('paciente_id,colaborador_id,colaboradores(nombre,apellidos)')

  // Obtener asignaciones de supervisor-paciente
  const { data: supAsignaciones } = await supabase
    .from('paciente_supervisor')
    .select('paciente_id,supervisor_id,supervisores(nombre,apellidos)')

  const colsByPaciente = (asignaciones ?? []).reduce((acc: Record<string, any[]>, a: any) => {
    const pid = a.paciente_id
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(a)
    return acc
  }, {})

  const supsByPaciente = (supAsignaciones ?? []).reduce((acc: Record<string, any>, a: any) => {
    acc[a.paciente_id] = a
    return acc
  }, {} as Record<string, any>)

  // Calcular siguiente código
  const maxCode = (pacientes ?? []).reduce((max: number, p: any) => {
    const n = parseInt(String(p.codigo || '').replace('P-', ''), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
  const nextCode = 'P-' + String(maxCode + 1).padStart(4, '0')

  const editing = editId ? (pacientes ?? []).find((p: any) => p.id === editId) : null
  const editingColIds = editing ? (colsByPaciente[editing.id] || []).map((a: any) => a.colaborador_id) : []
  const editingSupId = editing ? supsByPaciente[editing.id]?.supervisor_id || '' : ''

  return (
    <>
      {canEdit && (
        <section className="panel">
          <div className="panel-head">
            <h3>{editing ? 'Editar paciente' : 'Nuevo paciente'}</h3>
            {editing && <Link href="/pacientes" className="btn soft">Cancelar</Link>}
          </div>
          <form className="compact-form" action={editing ? editarPaciente : crearPaciente}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="row">
              <div className="field col-2">
                <label>Código</label>
                <input name="codigo" defaultValue={editing?.codigo || nextCode} required />
              </div>
              <div className="field col-3">
                <label>Nombre</label>
                <input name="nombre" defaultValue={editing?.nombre || ''} required />
              </div>
              <div className="field col-3">
                <label>Apellidos</label>
                <input name="apellidos" defaultValue={editing?.apellidos || ''} />
              </div>
              <div className="field col-2">
                <label>Email</label>
                <input name="email" type="email" defaultValue={editing?.email || ''} />
              </div>
              <div className="field col-2">
                <label>DNI</label>
                <input name="dni" defaultValue={editing?.dni || ''} />
              </div>
              <div className="field col-4">
                <label>Colaborador/es asignado/s</label>
                <select name="colaborador_ids" multiple size={3} defaultValue={editingColIds}>
                  {(colaboradores ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div className="field col-4">
                <label>Supervisor</label>
                <select name="supervisor_id" defaultValue={editingSupId}>
                  <option value="">Sin supervisor</option>
                  {(supervisores ?? []).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nombre} {s.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div className="field col-2">
                <label>Estado</label>
                <select name="activo" defaultValue={editing ? String(editing.activo !== false) : 'true'}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="field col-2">
                <button className="btn primary" type="submit">Guardar</button>
              </div>
            </div>
          </form>
        </section>
      )}

      {!canEdit && <div className="note">Tu usuario solo puede consultar los pacientes asignados.</div>}

      <section className="panel">
        <div className="panel-head">
          <h3>Listado de pacientes</h3>
          <span className="tag">{pacientes?.length ?? 0}</span>
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
              {(pacientes ?? []).length === 0 && (
                <tr><td colSpan={canEdit ? 8 : 7} className="center muted">Sin datos</td></tr>
              )}
              {(pacientes ?? []).map((p: any) => {
                const cols = (colsByPaciente[p.id] || [])
                  .map((a: any) => a.colaboradores ? `${a.colaboradores.nombre} ${a.colaboradores.apellidos || ''}` : '—')
                  .join(', ') || '—'
                const supA = supsByPaciente[p.id]
                const sup = supA?.supervisores ? `${supA.supervisores.nombre} ${supA.supervisores.apellidos || ''}` : '—'
                return (
                  <tr key={p.id}>
                    <td>{p.codigo}</td>
                    <td>{p.nombre} {p.apellidos || ''}</td>
                    <td>{p.email || '—'}</td>
                    <td>{p.dni || '—'}</td>
                    <td>{cols}</td>
                    <td>{sup}</td>
                    <td>{p.activo !== false
                      ? <span className="tag ok">Activo</span>
                      : <span className="tag warn">Inactivo</span>}
                    </td>
                    {canEdit && (
                      <td className="no-print nowrap">
                        <div className="button-line">
                          <Link href={`/pacientes?editId=${p.id}`} className="btn soft">Editar</Link>
                          <form action={borrarPaciente} style={{ display: 'inline' }}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="btn danger" type="submit">Borrar</button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
