'use server'

import { redirect } from 'next/navigation'
import { sendPasswordResetEmail } from '@/lib/auth/password-access'

export async function solicitarAcceso(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  if (!email) redirect('/login/recuperar?error=1')
  await sendPasswordResetEmail(email)
  redirect('/login?reset=1')
}
