import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { centsToEuros } from '@/lib/money'

export default async function RevisionPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { count: totalCitas } = await supabase.from('citas').select('*', { count: 'exact', head: true })
  const { count: realizadasSinLiquidar } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('estado', 'realizada').eq('pago_estado', 'pendiente').is('liquidacion_id', null)
  const { count: liquidacionesPendientes } = await supabase.from('liquidaciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
  const { count: recordatoriosDue } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('reminder_enabled', true).eq('reminder_status', 'pendiente').neq('estado', 'cancelada')
  const { data: sinLiquidar } = await supabase.from('citas').select('precio_cents').eq('estado', 'realizada').eq('pago_estado', 'pendiente').is('liquidacion_id', null)
  const pendienteBruto = (sinLiquidar ?? []).reduce((s: number, c: any) => s + (c.precio_cents || 0), 0)
  const neto = pendienteBruto - Math.round(pendienteBruto * 0.15)

  // Pacientes sin colaborador
  const { data: pacientesSinColab } = await supabase.from('pacientes').select('id,codigo,nombre,apellidos').not('id', 'in', `(select paciente_id from paciente_colaborador)`)

  return (
    <>
      <section className="audit-grid">
        <div className={`audit-card ${(realizadasSinLiquidar ?? 0) > 0 ? 'warning' : 'ok'}`}>
          <div className="subtle">Estado general</div>
          <div className="num">{(realizadasSinLiquidar ?? 0) > 0 ? 'Revisar' : 'Correcto'}</div>
        </div>
        <div className="audit-card">
          <div className="subtle">Citas visibles</div>
          <div className="num">{totalCitas ?? 0}</div>
        </div>
        <div className="audit-card">
          <div className="subtle">Realizadas sin liquidar</div>
          <div className="num">{realizadasSinLiquidar ?? 0}</div>
        </div>
        <div className="audit-card">
          <div className="subtle">Recordatorios para enviar</div>
          <div className="num">{recordatoriosDue ?? 0}</div>
        </div>
        <div className="audit-card">
          <div className="subtle">Liquidaciones pendientes</div>
          <div className="num">{liquidacionesPendientes ?? 0}</div>
        </div>
        <div className="audit-card">
          <div className="subtle">Pendiente neto estimado</div>
          <div className="num">{centsToEuros(neto)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Acciones rápidas</h3>
        </div>
        <div className="button-line no-print">
          <Link href="/cobros" className="btn soft">Ir a cobros</Link>
          <Link href="/recordatorios" className="btn soft">Ir a recordatorios</Link>
          <Link href="/calendario" className="btn soft">Ir al calendario</Link>
        </div>
        <div className="note" style={{ marginTop: 8 }}>
          Esta revisión no bloquea el uso del programa. Solo sirve para detectar datos incompletos o situaciones que podrían afectar a liquidaciones, recordatorios o exportaciones.
        </div>
      </section>
    </>
  )
}
