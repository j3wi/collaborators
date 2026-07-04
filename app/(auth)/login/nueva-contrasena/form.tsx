'use client'

import { useEffect, useState } from 'react'
import { guardarNuevaContrasena } from './actions'
import Link from 'next/link'

type State =
  | { status: 'loading' }
  | { status: 'ready'; access: string; refresh: string }
  | { status: 'no_token' }

const SESSION_KEY_AT = 'pw_reset_at'
const SESSION_KEY_RT = 'pw_reset_rt'

export function NuevaContrasenaForm({ error }: { error?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const run = async () => {
      // error=1 = servidor rechazó el enlace → limpiar y pedir uno nuevo
      if (error === '1') {
        sessionStorage.removeItem(SESSION_KEY_AT)
        sessionStorage.removeItem(SESSION_KEY_RT)
        setState({ status: 'no_token' })
        return
      }

      // Leer tokens del hash (primera visita desde el email)
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const params = new URLSearchParams(hash)
      const at = params.get('access_token')
      const rt = params.get('refresh_token')

      if (at && rt) {
        sessionStorage.setItem(SESSION_KEY_AT, at)
        sessionStorage.setItem(SESSION_KEY_RT, rt)
        window.history.replaceState({}, '', window.location.pathname)
        setState({ status: 'ready', access: at, refresh: rt })
        return
      }

      // Recuperar tokens de sessionStorage (tras redirect por error de validación)
      const storedAt = sessionStorage.getItem(SESSION_KEY_AT)
      const storedRt = sessionStorage.getItem(SESSION_KEY_RT)
      if (storedAt && storedRt) {
        setState({ status: 'ready', access: storedAt, refresh: storedRt })
        return
      }

      setState({ status: 'no_token' })
    }
    void run()
  }, [error])

  if (state.status === 'loading') {
    return (
      <div className="login-box">
        <h1>Crear nueva contraseña</h1>
        <div className="note">Verificando enlace de acceso…</div>
      </div>
    )
  }

  return (
    <form action={guardarNuevaContrasena} className="login-box">
      <h1>Crear nueva contraseña</h1>
      <p className="subtle">Usa este formulario después de abrir el enlace de acceso que te hemos enviado por email.</p>

      {state.status === 'ready' && (
        <>
          <input type="hidden" name="access_token" value={state.access} />
          <input type="hidden" name="refresh_token" value={state.refresh} />
        </>
      )}

      {state.status === 'no_token' && (
        <div className="note">El enlace no es válido o ha caducado. Solicita uno nuevo.</div>
      )}
      {error === '2' && state.status === 'ready' && (
        <div className="note">Las contraseñas no coinciden.</div>
      )}
      {error === '3' && state.status === 'ready' && (
        <div className="note">La contraseña debe tener al menos 8 caracteres.</div>
      )}
      {error === '4' && state.status === 'ready' && (
        <div className="note">No se pudo guardar la contraseña. Inténtalo de nuevo.</div>
      )}

      {state.status === 'ready' && (
        <>
          <div className="field">
            <label>Nueva contraseña</label>
            <input name="password" type="password" required minLength={8} />
          </div>
          <div className="field">
            <label>Confirmar contraseña</label>
            <input name="confirmPassword" type="password" required minLength={8} />
          </div>
          <button className="btn primary" type="submit">Guardar contraseña</button>
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <Link href="/login/recuperar" className="btn soft">Solicitar otro enlace</Link>
      </div>
    </form>
  )
}

