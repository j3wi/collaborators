import { createClient } from '@/utils/supabase/server'
import { requireProfile } from '@/lib/auth/server'
import { format } from 'date-fns'
export default async function DashboardPage() {
  await requireProfile(); const supabase = await createClient(); const today = format(new Date(), 'yyyy-MM-dd')
  const { count: citasHoy } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('fecha', today)
  const { count: recordatoriosPendientes } = await supabase.from('citas').select('*', { count: 'exact', head: true }).eq('reminder_status', 'pendiente').eq('reminder_enabled', true)
  const { count: liquidacionesPendientes } = await supabase.from('liquidaciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
  return <section className="panel"><h1>Inicio</h1><div className="stats-grid"><div className="stat"><span>Citas hoy</span><strong>{citasHoy ?? 0}</strong></div><div className="stat"><span>Recordatorios pendientes</span><strong>{recordatoriosPendientes ?? 0}</strong></div><div className="stat"><span>Liquidaciones pendientes</span><strong>{liquidacionesPendientes ?? 0}</strong></div></div></section>
}
