'use server'

import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'

async function getOrigin() {
  const headerStore = await headers()
  return headerStore.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

// Cliente dedicado para correos auth. Evita PKCE y produce enlaces con hash tokens
// que el destinatario puede usar en su navegador sin depender de verifier previo.
function createEmailAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

async function sendRecoveryEmail(email: string, redirectTo: string) {
  const supabase = createEmailAuthClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(error.message)
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

  await sendRecoveryEmail(normalizedEmail, redirectTo)
  console.log('sendPasswordSetupEmail: Recovery email sent', { redirectTo })
}

export async function sendPasswordResetEmail(email: string) {
  const origin = await getOrigin()
  const redirectTo = `${origin}/login/nueva-contrasena`
  await sendRecoveryEmail(email, redirectTo)
  console.log('sendPasswordResetEmail: Recovery email sent', { redirectTo })
}

