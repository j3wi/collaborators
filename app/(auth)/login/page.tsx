import { login } from './actions'

export default function LoginPage() {
  return (
    <main className="login-page">
      <form action={login} className="login-box">
        <h1>Programa Cuentas Colaboradores</h1>
        <h2>Hipatia · Centro de Psicología</h2>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input name="password" type="password" required />
        </div>
        <button className="btn-primary" type="submit" style={{ width: '100%' }}>Entrar</button>
      </form>
    </main>
  )
}
