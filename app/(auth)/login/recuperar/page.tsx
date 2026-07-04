import Link from 'next/link'
import { solicitarAcceso } from './actions'

export default async function RecuperarAccesoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams

  return (
    <main className="login-page">
      <form action={solicitarAcceso} className="login-box">
        <h1>Solicitar acceso</h1>
        <p className="subtle">Introduce tu email para recibir el enlace con el que crear o restablecer tu contraseña.</p>
        {params.error && <div className="note">Revisa el email introducido e inténtalo de nuevo.</div>}
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <button className="btn primary" type="submit">Enviar enlace</button>
        <div style={{ marginTop: 12 }}>
          <Link href="/login" className="btn soft">Volver al login</Link>
        </div>
      </form>
    </main>
  )
}
