import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'

export default async function CobrosPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Citas realizadas pendientes
  const { data: citasPendientes } = await supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,precio_cents,estado,pago_estado,liquidacion_id,servicios(nombre),colaboradores(nombre,apellidos),supervisores(nombre,apellidos)')
    .eq('estado', 'realizada')
    .eq('pago_estado', 'pendiente')
    .order('fecha')
    .order('hora_inicio')

  const sinLiquidar = (citasPendientes ?? []).filter((c: any) => !c.liquidacion_id)
  const subtotal = sinLiquidar.reduce((s: number, c: any) => s + (c.precio_cents || 0), 0)
  const irpf = Math.round(subtotal * 0.15)
  const total = subtotal - irpf

  // Liquidaciones
  const { data: liquidaciones } = await supabase
    .from('liquidaciones')
    .select('id,numero,periodo_desde,periodo_hasta,subtotal_cents,irpf_cents,total_cents,estado,payment_date,payment_method,colaboradores(nombre,apellidos)')
    .order('created_at', { ascending: false })

  return (
    <>
      <section className="panel">
        <div className="panel-head"><h3>Citas realizadas pendientes de pago</h3><span className="tag">{sinLiquidar.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Hora</th><th>Servicio</th><th>Colaborador</th><th className="right">Precio</th><th>Estado</th></tr></thead>
            <tbody>
              {sinLiquidar.length === 0 && <tr><td colSpan={6} className="center muted">Sin citas pendientes</td></tr>}
              {sinLiquidar.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.fecha}</td>
                  <td>{c.hora_inicio} - {c.hora_fin}</td>
                  <td>{c.servicios?.nombre ?? '—'}</td>
                  <td>{c.colaboradores ? `${c.colaboradores.nombre} ${c.colaboradores.apellidos || ''}` : '—'}</td>
                  <td className="right">{centsToEuros(c.precio_cents)}</td>
                  <td>
                    <span className="tag ok">Realizada</span>{' '}
                    <span className="tag warn">Pendiente</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <div className="total-pill"><span className="subtle">Subtotal</span><strong>{centsToEuros(subtotal)}</strong></div>
          <div className="total-pill"><span className="subtle">IRPF 15%</span><strong>{centsToEuros(irpf)}</strong></div>
          <div className="total-pill"><span className="subtle">Total a facturar</span><strong>{centsToEuros(total)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Liquidaciones generadas</h3><span className="tag">{liquidaciones?.length ?? 0}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nº</th><th>Periodo</th><th>Colaborador</th><th className="right">Subtotal</th><th className="right">IRPF</th><th className="right">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {(liquidaciones ?? []).length === 0 && <tr><td colSpan={7} className="center muted">Sin liquidaciones</td></tr>}
              {(liquidaciones ?? []).map((l: any) => (
                <tr key={l.id}>
                  <td>{l.numero}</td>
                  <td>{l.periodo_desde} — {l.periodo_hasta}</td>
                  <td>{l.colaboradores ? `${l.colaboradores.nombre} ${l.colaboradores.apellidos || ''}` : '—'}</td>
                  <td className="right">{centsToEuros(l.subtotal_cents)}</td>
                  <td className="right">{centsToEuros(l.irpf_cents)}</td>
                  <td className="right"><strong>{centsToEuros(l.total_cents)}</strong></td>
                  <td>{l.estado === 'pagada' ? <span className="tag ok">Pagada</span> : <span className="tag warn">Pendiente</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
