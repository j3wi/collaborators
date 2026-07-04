'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type BridgeState = 'checking' | 'ready' | 'invalid'

export function SessionBridge({ initialError }: { initialError?: string }) {
  const [state, setState] = useState<BridgeState>('checking')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()

      // Caso 1: hay tokens en el hash (flujo implicit de Supabase)
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        console.log('SessionBridge: tokens found in hash, calling setSession')
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (error) {
          console.error('SessionBridge: setSession failed:', error.message)
          setState('invalid')
          return
        }
        // Limpiar hash y cualquier ?error de la URL
        const cleanUrl = new URL(window.location.href)
        cleanUrl.hash = ''
        cleanUrl.searchParams.delete('error')
        window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search)
        setState('ready')
        return
      }

      // Caso 2: ya hay una sesión establecida (ej. recarga de página)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('SessionBridge: existing session found')
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('error')
        window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search)
        setState('ready')
        return
      }

      // No hay tokens ni sesión
      console.log('SessionBridge: no tokens and no session')
      setState('invalid')
    }

    void run()
  }, [])

  if (state === 'checking') {
    return <div className="note">Verificando tu enlace de acceso…</div>
  }

  if (state === 'invalid') {
    return <div className="note">No hemos podido validar el enlace. Solicita uno nuevo e inténtalo otra vez.</div>
  }

  return null
}







