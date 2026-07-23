import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearSupervisor, editarSupervisor } from './actions'
import Link from 'next/link'
import { SupervisoresTable } from './supervisores-table'

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

  // Contar citas por supervisor
  const { data: citasData } = await supabase
    .from('citas')
    .select('supervisor_id')
  const citasPorSupervisor = new Map<string, number>()
  ;(citasData ?? []).forEach((cita: any) => {
    if (cita.supervisor_id) {
      citasPorSupervisor.set(cita.supervisor_id, (citasPorSupervisor.get(cita.supervisor_id) ?? 0) + 1)
    }
  })

  const editing = editId ? (supervisores ?? []).find((s: any) => s.id === editId) : null
  const supervisorRows = (supervisores ?? []).map((s: any) => {
    const estado: 'activo' | 'inactivo' = s.activo !== false ? 'activo' : 'inactivo'
    return {
      id: s.id,
      nombre: `${s.nombre || ''} ${s.apellidos || ''}`.trim(),
      email: s.email || '',
      estado,
      citasCount: citasPorSupervisor.get(s.id) ?? 0,
    }
  })

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
        <SupervisoresTable supervisores={supervisorRows as any} />
      </section>
    </>
  )
}
