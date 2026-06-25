import { requireProfile } from '@/lib/auth/server'
import { createClient } from '@/utils/supabase/server'
export default async function CalendarioPage() {
  await requireProfile(); const supabase = await createClient()
  const { data: citas } = await supabase.from('citas').select('id,fecha,hora_inicio,hora_fin,estado,pago_estado,precio_cents,servicios(nombre),colaboradores(nombre,apellidos)').order('fecha').order('hora_inicio')
  return <section className="panel"><h1>Calendario</h1><p className="muted">Primer paso: listado. Después se implementan vista mensual y semanal como en Estable 9.</p><table><thead><tr><th>Fecha</th><th>Hora</th><th>Servicio</th><th>Estado</th></tr></thead><tbody>{(citas ?? []).map((c: any) => <tr key={c.id}><td>{c.fecha}</td><td>{c.hora_inicio} - {c.hora_fin}</td><td>{c.servicios?.nombre ?? '—'}</td><td>{c.estado}</td></tr>)}</tbody></table></section>
}
