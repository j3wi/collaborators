'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function guardarNuevaContrasena(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')
  const accessToken = String(formData.get('access_token') || '')
  const refreshToken = String(formData.get('refresh_token') || '')

  if (!password || password.length < 8) redirect('/login/nueva-contrasena?error=3')
  if (password !== confirmPassword) redirect('/login/nueva-contrasena?error=2')

  const supabase = await createClient()

  // setSession en el servidor: aquí no hay restricción de "secret API key in browser"
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (sessionError) {
      console.error('guardarNuevaContrasena: setSession failed:', sessionError.message)
      redirect('/login/nueva-contrasena?error=1')
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('guardarNuevaContrasena: no user in session')
    redirect('/login/nueva-contrasena?error=1')
  }

  console.log('guardarNuevaContrasena: updating password for', user.email)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('guardarNuevaContrasena: updateUser error:', error.message)
    redirect('/login/nueva-contrasena?error=4')
  }

  redirect('/login?password=1')
}
