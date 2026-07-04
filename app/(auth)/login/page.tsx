import { login } from './actions'
import Link from 'next/link'
import { RecoveryRedirect } from './recovery-redirect'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string; password?: string }> }) {
  const params = await searchParams

  return (
    <main className="login-page">
      <RecoveryRedirect />
      <form action={login} className="login-box">
        <h1>Programa Cuentas Colaboradores</h1>
        <h2>Hipatia · Centro de Psicología</h2>
        {params.reset && <div className="note">Te hemos enviado un enlace para crear o restablecer tu contraseña.</div>}
        {params.password && <div className="note">Tu contraseña se ha actualizado. Ya puedes iniciar sesión.</div>}
        {params.error && <div className="note">No hemos podido iniciar sesión. Comprueba tu email y contraseña.</div>}
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input name="password" type="password" required />
        </div>
        <button className="btn primary" type="submit">Entrar</button>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <Link href="/login/recuperar" className="btn soft">¿Primera vez o no recuerdas la contraseña?</Link>
        </div>
      </form>
    </main>
  )
}
