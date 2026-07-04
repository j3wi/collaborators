'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DebugAuthPage() {
  const [debugData, setDebugData] = useState<{
    hashParams: Record<string, string>
    sessionInfo: any
    fullUrl: string
    hash: string
    loading: boolean
  }>({
    hashParams: {},
    sessionInfo: null,
    fullUrl: '',
    hash: '',
    loading: true,
  })

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const params = new URLSearchParams(hash)
    const paramsObj: Record<string, string> = {}

    params.forEach((value, key) => {
      paramsObj[key] = value.length > 100 ? value.substring(0, 100) + '...' : value
    })

    // Check session
    const checkSession = async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        setDebugData(prev => ({
          ...prev,
          hashParams: paramsObj,
          fullUrl: window.location.href,
          hash: window.location.hash,
          sessionInfo: {
            hasSession: !!session,
            user: session?.user ? { id: session.user.id, email: session.user.email } : null,
            error: error?.message
          },
          loading: false
        }))
      } catch (err) {
        setDebugData(prev => ({
          ...prev,
          hashParams: paramsObj,
          fullUrl: window.location.href,
          hash: window.location.hash,
          sessionInfo: { error: String(err) },
          loading: false
        }))
      }
    }

    void checkSession()
  }, [])

  return (
    <main className="login-page">
      <div className="login-box">
        <h1>Debug de Autenticación</h1>
        <p className="subtle">Esta página muestra información de tu enlace de acceso.</p>

        <h3>URL Debug</h3>
        <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
          {JSON.stringify(
            {
              fullUrl: debugData.fullUrl,
              hash: debugData.hash,
              hashParams: debugData.hashParams
            },
            null,
            2
          )}
        </pre>

        <h3>Session Info</h3>
        {debugData.loading ? (
          <div>Verificando sesión...</div>
        ) : (
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, fontSize: 12 }}>
            {JSON.stringify(debugData.sessionInfo, null, 2)}
          </pre>
        )}

        <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
          <p className="subtle">La información que ves aquí es solo para debugging.</p>
          <Link href="/login/nueva-contrasena" className="btn soft">
            Volver a Nueva Contraseña
          </Link>
          <Link href="/login" className="btn soft">
            Volver a Login
          </Link>
        </div>
      </div>
    </main>
  )
}



