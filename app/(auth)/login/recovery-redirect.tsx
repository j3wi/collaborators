'use client'

import { useEffect } from 'react'

// Detecta tokens de recovery/invite en el hash y redirige a la página
// de nueva contraseña para que SessionBridge los procese.
export function RecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!hash) return

    const params = new URLSearchParams(hash)
    const type = params.get('type')
    const accessToken = params.get('access_token')

    if (accessToken && (type === 'recovery' || type === 'invite')) {
      window.location.replace(`/login/nueva-contrasena${window.location.hash}`)
    }
  }, [])

  return null
}

