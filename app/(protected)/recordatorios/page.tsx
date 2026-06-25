import { requireProfile } from '@/lib/auth/server'
export default async function Page() { await requireProfile(); return <section className="panel"><h1>Recordatorios</h1><p className="muted">Pendiente de implementación funcional. Ruta preparada.</p></section> }
