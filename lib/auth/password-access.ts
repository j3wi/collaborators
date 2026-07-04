'use server'

import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/utils/supabase/admin'

async function getOrigin() {
  const headerStore = await headers()
  return headerStore.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

// Usamos flowType: 'implicit' para los correos de recuperación porque PKCE
// guarda el verifier en las cookies de quien llama, pero el destinatario abre
// el enlace en otro navegador → exchangeCodeForSession siempre falla.
// Con implicit flow, Supabase redirige con #access_token en el hash, que
// son tokens de usuario normales y funcionan con setSession() en el cliente.
async function createImplicitFlowClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: 'implicit' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

export async function sendPasswordSetupEmail(email: string) {
  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  const origin = await getOrigin()
  const redirectTo = `${origin}/login/nueva-contrasena`

  // Crear usuario si no existe todavía (contraseña temporal, la cambiará via email)
  const { error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: crypto.randomUUID(),
    email_confirm: false,
  })

  if (createError) {
    const alreadyExists = createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('registered')
    if (!alreadyExists) {
      console.error('sendPasswordSetupEmail: createUser failed:', createError.message)
      throw new Error(createError.message)
    }
    console.log('sendPasswordSetupEmail: User already exists, sending reset email')
  } else {
    console.log('sendPasswordSetupEmail: New user created')
  }

  const supabase = await createImplicitFlowClient()
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
  if (error) throw new Error(error.message)
  console.log('sendPasswordSetupEmail: Recovery email sent', { redirectTo })
}

export async function sendPasswordResetEmail(email: string) {
  const origin = await getOrigin()
  const redirectTo = `${origin}/login/nueva-contrasena`
  const supabase = await createImplicitFlowClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(error.message)
  console.log('sendPasswordResetEmail: Recovery email sent', { redirectTo })
}

