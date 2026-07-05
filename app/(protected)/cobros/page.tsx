import { createClient } from '@/utils/supabase/server'
import { canManageLiquidaciones, requireProfile } from '@/lib/auth/server'
import { CobrosBoard } from './cobros-board'
import { actualizarCitasSeleccion, borrarLiquidacion, crearLiquidacionesDesdeSeleccion, marcarLiquidacionPagada, marcarLiquidacionPendiente } from './actions'

export default async function CobrosPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const canManage = canManageLiquidaciones(profile)
  const lockColaboradorId = profile.role === 'colaborador' ? String((profile as any).colaborador_id || '') : ''

  let citasQuery = supabase
    .from('citas')
    .select('id,fecha,hora_inicio,hora_fin,precio_cents,estado,pago_estado,liquidacion_id,colaborador_id,supervisor_id,servicios(nombre),colaboradores(nombre,apellidos),supervisores(nombre,apellidos),cita_pacientes(paciente_id)')
    .order('fecha')
    .order('hora_inicio')

  if (lockColaboradorId) citasQuery = citasQuery.eq('colaborador_id', lockColaboradorId)
  const { data: citas } = await citasQuery

  let liquidacionesQuery = supabase
    .from('liquidaciones')
    .select('id,numero,periodo_desde,periodo_hasta,colaborador_id,supervisor_id,subtotal_cents,irpf_cents,total_cents,estado,payment_date,payment_method,colaboradores(nombre,apellidos),supervisores(nombre,apellidos),liquidacion_citas(cita_id)')
    .order('created_at', { ascending: false })

  if (lockColaboradorId) liquidacionesQuery = liquidacionesQuery.eq('colaborador_id', lockColaboradorId)
  const { data: liquidaciones } = await liquidacionesQuery

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

  const citasRows = (citas ?? []).map((cita: any) => ({
    id: cita.id,
    fecha: cita.fecha || '',
    horaInicio: cita.hora_inicio || '',
    horaFin: cita.hora_fin || '',
    precioCents: Number(cita.precio_cents) || 0,
    estado: cita.estado || '',
    pagoEstado: cita.pago_estado || 'pendiente',
    liquidacionId: cita.liquidacion_id || '',
    colaboradorId: cita.colaborador_id || '',
    supervisorId: cita.supervisor_id || '',
    servicio: cita.servicios?.nombre || '',
    colaboradorNombre: cita.colaboradores ? `${cita.colaboradores.nombre || ''} ${cita.colaboradores.apellidos || ''}`.trim() : '',
    supervisorNombre: cita.supervisores ? `${cita.supervisores.nombre || ''} ${cita.supervisores.apellidos || ''}`.trim() : '',
    participantes: (cita.cita_pacientes || []).length,
  }))

  const liquidacionesRows = (liquidaciones ?? []).map((liquidacion: any) => ({
    id: liquidacion.id,
    numero: liquidacion.numero || '',
    periodoDesde: liquidacion.periodo_desde || '',
    periodoHasta: liquidacion.periodo_hasta || '',
    colaboradorId: liquidacion.colaborador_id || '',
    supervisorId: liquidacion.supervisor_id || '',
    colaboradorNombre: liquidacion.colaboradores ? `${liquidacion.colaboradores.nombre || ''} ${liquidacion.colaboradores.apellidos || ''}`.trim() : '',
    supervisorNombre: liquidacion.supervisores ? `${liquidacion.supervisores.nombre || ''} ${liquidacion.supervisores.apellidos || ''}`.trim() : '',
    subtotalCents: Number(liquidacion.subtotal_cents) || 0,
    irpfCents: Number(liquidacion.irpf_cents) || 0,
    totalCents: Number(liquidacion.total_cents) || 0,
    estado: liquidacion.estado || 'pendiente',
    paymentDate: liquidacion.payment_date || '',
    paymentMethod: liquidacion.payment_method || '',
    citasCount: (liquidacion.liquidacion_citas || []).length,
  }))

  const colaboradoresRows = (colaboradores ?? []).map((colaborador: any) => ({
    id: colaborador.id,
    nombre: `${colaborador.nombre || ''} ${colaborador.apellidos || ''}`.trim() || 'Sin nombre',
  }))

  const supervisoresRows = (supervisores ?? []).map((supervisor: any) => ({
    id: supervisor.id,
    nombre: `${supervisor.nombre || ''} ${supervisor.apellidos || ''}`.trim() || 'Sin nombre',
  }))

  return (
    <CobrosBoard
      citas={citasRows}
      liquidaciones={liquidacionesRows}
      colaboradores={colaboradoresRows}
      supervisores={supervisoresRows}
      lockColaboradorId={lockColaboradorId}
      canManage={canManage}
      crearLiquidacionesAction={crearLiquidacionesDesdeSeleccion}
      actualizarCitasAction={actualizarCitasSeleccion}
      marcarLiquidacionPagadaAction={marcarLiquidacionPagada}
      marcarLiquidacionPendienteAction={marcarLiquidacionPendiente}
      borrarLiquidacionAction={borrarLiquidacion}
    />
  )
}
