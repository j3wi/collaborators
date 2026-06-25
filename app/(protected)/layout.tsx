import Link from 'next/link'
import { requireProfile } from '@/lib/auth/server'
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><strong>Hipatia</strong><span>{profile.role}</span></div><nav><Link href="/dashboard">Inicio</Link><Link href="/calendario">Calendario</Link><Link href="/pacientes">Pacientes</Link><Link href="/colaboradores">Colaboradores</Link><Link href="/supervisores">Supervisores</Link><Link href="/servicios">Servicios</Link><Link href="/cobros">Cobros / Liquidaciones</Link><Link href="/recordatorios">Recordatorios</Link><Link href="/revision">Revisión de datos</Link><Link href="/configuracion">Configuración</Link></nav><form action="/logout" method="post"><button className="btn-soft">Salir</button></form></aside><main className="content">{children}</main></div>
}
