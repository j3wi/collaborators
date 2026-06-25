import { requireProfile } from '@/lib/auth/server'

export default async function ConfiguracionPage() {
  const profile = await requireProfile()
  const role = profile.role as string

  if (role === 'colaborador') {
    return <div className="note">No tienes permiso para esta sección.</div>
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head"><h3>Configuración general</h3></div>
        <div className="note">
          Los datos se gestionan a través de Supabase. Las configuraciones de identificación de paciente, plantillas de recordatorios y demás se guardan en la tabla <code>settings</code> de la base de datos.
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Plantilla de recordatorios</h3><span className="tag">Se aplica por defecto</span></div>
        <div className="note">
          La plantilla general de recordatorios se gestiona desde la tabla <code>recordatorio_templates</code> en Supabase. Las variables disponibles son: {'{fecha}'}, {'{hora}'}, {'{servicio}'}, {'{pacientes}'}, {'{colaborador}'}, {'{supervisor}'}, {'{meet}'}, {'{mensaje}'}, {'{centro}'}.
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Datos del sistema</h3></div>
        <div className="note">
          Este proyecto usa Supabase como backend con autenticación real, políticas RLS de seguridad y base de datos PostgreSQL. Los datos de usuario se gestionan a través de la tabla <code>profiles</code>.
        </div>
      </section>
    </>
  )
}
