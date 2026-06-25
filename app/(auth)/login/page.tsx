import { login } from './actions'
export default function LoginPage() {
  return <main className="login-page"><form action={login} className="login-box"><h1>Hipatia</h1><h2>Programa Cuentas Colaboradores</h2><label>Email</label><input name="email" type="email" required /><label>Contraseña</label><input name="password" type="password" required /><button type="submit">Entrar</button></form></main>
}
