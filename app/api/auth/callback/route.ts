import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) return '/login/nueva-contrasena'
  return next
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = getSafeNextPath(request.nextUrl.searchParams.get('next'))

  console.log('Auth callback:', { code: !!code, next })

  if (!code) {
    console.warn('Auth callback: No code in query params, redirecting to', next)
    const errorUrl = new URL('/login/nueva-contrasena?error=1', request.url)
    return NextResponse.redirect(errorUrl)
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback: exchangeCodeForSession failed:', error.message)
    const errorUrl = new URL('/login/nueva-contrasena?error=1', request.url)
    return NextResponse.redirect(errorUrl)
  }

  console.log('Auth callback: Session exchanged successfully')
  return NextResponse.redirect(new URL(next, request.url))
}

