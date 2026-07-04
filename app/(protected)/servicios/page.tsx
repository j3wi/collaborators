import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { crearServicio, editarServicio } from './actions'
import Link from 'next/link'
import { ServiciosTable } from './servicios-table'

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
  const serviceRows = (servicios ?? []).map((s: any) => ({
    id: s.id,
    nombre: s.nombre || '',
    precioCents: Number(s.precio_cents) || 0,
    duracionMin: Number(s.duracion_min) || 0,
    estado: s.activo !== false ? 'activo' : 'inactivo',
  }))

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
        <ServiciosTable servicios={serviceRows} canEdit={canEdit} />
      </section>
    </>
  )
}
