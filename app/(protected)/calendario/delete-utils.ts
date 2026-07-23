export type DeleteSeriesCita = {
  id: string
  fecha: string
  hora_inicio: string
  colaborador_id: string
  cita_pacientes?: Array<{ pacientes?: { id?: string | null } | null }>
}

function toDate(dateStr: string): Date {
  const [year, month, day] = String(dateStr || '').split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0)
}

function getPatientIds(cita: DeleteSeriesCita): string[] {
  return (cita.cita_pacientes || [])
    .map((row) => row.pacientes?.id)
    .filter((id): id is string => Boolean(id))
}

export function isSameDeleteSeries(base: DeleteSeriesCita, candidate: DeleteSeriesCita): boolean {
  if (base.id === candidate.id) return true
  if (base.colaborador_id !== candidate.colaborador_id) return false
  if (base.hora_inicio !== candidate.hora_inicio) return false
  if (toDate(base.fecha).getDay() !== toDate(candidate.fecha).getDay()) return false

  const basePatientIds = new Set(getPatientIds(base))
  if (!basePatientIds.size) return false

  return getPatientIds(candidate).some((id) => basePatientIds.has(id))
}

export function getFollowingDeleteCount(base: DeleteSeriesCita, citas: DeleteSeriesCita[]): number {
  const series = citas
    .filter((candidate) => isSameDeleteSeries(base, candidate))
    .slice()
    .sort((a, b) => {
      const dateCompare = a.fecha.localeCompare(b.fecha)
      if (dateCompare !== 0) return dateCompare
      const timeCompare = a.hora_inicio.localeCompare(b.hora_inicio)
      if (timeCompare !== 0) return timeCompare
      return a.id.localeCompare(b.id)
    })

  const index = series.findIndex((cita) => cita.id === base.id)
  if (index < 0) return 0
  return Math.max(0, series.length - index - 1)
}

export function getFollowingDeleteLabel(count: number): string {
  if (count <= 0) return 'Solo esta cita'
  return count === 1 ? 'Borrar esta y la siguiente' : `Borrar esta y las ${count} siguientes`
}


