import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearColaborador, editarColaborador } from './actions'
import Link from 'next/link'
import { ColaboradoresTable } from './colaboradores-table'

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

  // Contar citas por colaborador
  const { data: citasData } = await supabase
    .from('citas')
    .select('colaborador_id')
  const citasPorColaborador = new Map<string, number>()
  ;(citasData ?? []).forEach((cita: any) => {
    const id = cita.colaborador_id
    citasPorColaborador.set(id, (citasPorColaborador.get(id) ?? 0) + 1)
  })

  const editing = editId ? (colaboradores ?? []).find((c: any) => c.id === editId) : null
  const collaboratorRows = (colaboradores ?? []).map((c: any) => ({
    id: c.id,
    nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
    email: c.email || '',
    dni: c.dni || '',
    direccion: c.direccion || '',
    estado: c.activo !== false ? 'activo' : 'inactivo',
    citasCount: citasPorColaborador.get(c.id) ?? 0,
  }))

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
        <ColaboradoresTable colaboradores={collaboratorRows} canEdit={canEdit} />
      </section>
    </>
  )
}
