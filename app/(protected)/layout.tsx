import Link from 'next/link'
import { requireProfile } from '@/lib/auth/server'

const roleLabel: Record<string, string> = {
  admin: 'Administración',
  supervisor: 'Supervisor/a',
  colaborador: 'Colaborador/a',
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  const role = profile.role as string
  const isColab = role === 'colaborador'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <strong>Hipatia</strong>
            <span>{roleLabel[role] || role}</span>
          </div>
        </div>
        <nav>
          <Link href="/dashboard">Inicio</Link>
          <Link href="/calendario">Calendario / citas</Link>
          <Link href="/pacientes">Pacientes</Link>
          {!isColab && <Link href="/colaboradores">Colaboradores</Link>}
          {!isColab && <Link href="/supervisores">Supervisores</Link>}
          <Link href="/servicios">Servicios</Link>
          <Link href="/cobros">Cobros / Liquidaciones</Link>
          <Link href="/recordatorios">Recordatorios</Link>
          <Link href="/revision">Revisión de datos</Link>
          {!isColab && <Link href="/configuracion">Configuración</Link>}
        </nav>
        <div className="side-footer">
          <div className="subtle">
            <strong>{profile.nombre} {profile.apellidos || ''}</strong><br />
            {roleLabel[role] || role}
          </div>
          <form action="/logout" method="post">
            <button className="btn-soft" style={{ width: '100%', marginTop: 8 }}>Salir</button>
          </form>
        </div>
      </aside>
      <main className="content">
        {children}
      </main>
    </div>
  )
}
