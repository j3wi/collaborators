import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'

export default async function DashboardPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const role = profile.role as string
  const today = new Date().toISOString().slice(0, 10)
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  // Citas hoy
  const { count: citasHoy } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('fecha', today).neq('estado', 'cancelada')
  // Próximos 7 días
  const { count: citasSemana } = await supabase.from('citas').select('*', { count: 'exact', head: true }).gte('fecha', today).lte('fecha', weekEnd).neq('estado', 'cancelada')
  // Recordatorios pendientes
  const { count: recordatoriosPendientes } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('reminder_enabled', true).eq('reminder_status', 'pendiente').neq('estado', 'cancelada')
  // Liquidaciones pendientes
  const { count: liquidacionesPendientes } = await supabase.from('liquidaciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
  // Citas realizadas sin liquidar
  const { data: sinLiquidar } = await supabase.from('citas').select('precio_cents').eq('estado', 'realizada').eq('pago_estado', 'pendiente').is('liquidacion_id', null)
  const sinLiquidarCount = sinLiquidar?.length ?? 0
  const pendienteBruto = (sinLiquidar ?? []).reduce((s: number, c: any) => s + (c.precio_cents || 0), 0)
  const irpfEstimado = Math.round(pendienteBruto * 0.15)
  const netoEstimado = pendienteBruto - irpfEstimado

  // Próximas citas
  const { data: proximasCitas } = await supabase.from('citas').select('id,fecha,hora_inicio,hora_fin,precio_cents,estado,reminder_enabled,servicios(nombre),colaboradores(nombre,apellidos)').gte('fecha', today).neq('estado', 'cancelada').order('fecha').order('hora_inicio').limit(6)

  const roleLabels: Record<string, string> = { admin: 'Administración', supervisor: 'Supervisor/a', colaborador: 'Colaborador/a' }
  const roleMsg: Record<string, string> = {
    admin: 'Modo administración: acceso completo.',
    supervisor: 'Modo supervisor: acceso completo de supervisión.',
    colaborador: 'Modo colaborador: solo ves pacientes, citas, recordatorios y cobros asignados a tu usuario.',
  }

  return (
    <>
      <section className="grid-cards">
        <div className="metric"><div className="subtle">Citas hoy</div><div className="num">{citasHoy ?? 0}</div></div>
        <div className="metric"><div className="subtle">Próximos 7 días</div><div className="num">{citasSemana ?? 0}</div></div>
        <div className="metric"><div className="subtle">Recordatorios pendientes</div><div className="num">{recordatoriosPendientes ?? 0}</div></div>
        <div className="metric"><div className="subtle">Liquidaciones pendientes</div><div className="num">{liquidacionesPendientes ?? 0}</div></div>
        <div className="metric"><div className="subtle">Citas sin liquidar</div><div className="num">{sinLiquidarCount}</div></div>
        <div className="metric"><div className="subtle">Pendiente bruto</div><div className="num">{centsToEuros(pendienteBruto)}</div></div>
        <div className="metric"><div className="subtle">IRPF estimado</div><div className="num">{centsToEuros(irpfEstimado)}</div></div>
        <div className="metric"><div className="subtle">A facturar neto</div><div className="num">{centsToEuros(netoEstimado)}</div></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Accesos rápidos</h3>
          <span className="tag">{roleLabels[role] || role}</span>
        </div>
        <div className="quick-actions no-print">
          <Link href="/calendario" className="btn primary">Nueva cita</Link>
          <Link href="/calendario" className="btn soft">Calendario</Link>
          <Link href="/recordatorios" className="btn soft">Recordatorios</Link>
          <Link href="/revision" className="btn soft">Revisión de datos</Link>
          <Link href="/cobros" className="btn soft">Cobros / liquidaciones</Link>
          <Link href="/pacientes" className="btn soft">Pacientes</Link>
          {role !== 'colaborador' && <Link href="/configuracion" className="btn soft">Configuración</Link>}
        </div>
        <div className="dashboard-alert" style={{ marginTop: 8 }}>
          {roleMsg[role] || ''}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Próximas citas</h3>
            <Link href="/calendario" className="btn soft no-print">Ver calendario</Link>
          </div>
          <div className="mini-stack">
            {(proximasCitas ?? []).length === 0 && <div className="note">No hay próximas citas.</div>}
            {(proximasCitas ?? []).map((c: any) => (
              <div key={c.id} className="mini-item">
                <div className="mini-item-main">
                  <div className="mini-item-title">{c.fecha} · {c.hora_inicio}</div>
                  <div className="mini-item-text">
                    {c.servicios?.nombre ?? 'Servicio'} · {c.colaboradores ? `${c.colaboradores.nombre} ${c.colaboradores.apellidos || ''}` : '—'} · {centsToEuros(c.precio_cents)}
                    {c.reminder_enabled ? ' · recordatorio' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Citas sin liquidar</h3>
            <Link href="/cobros" className="btn soft no-print">Ir a cobros</Link>
          </div>
          <div className="mini-stack">
            {sinLiquidarCount === 0
              ? <div className="note">No hay citas realizadas pendientes de liquidar.</div>
              : <div className="note">{sinLiquidarCount} cita(s) realizadas pendientes · {centsToEuros(netoEstimado)} neto estimado</div>
            }
          </div>
        </section>
      </div>
    </>
  )
}
