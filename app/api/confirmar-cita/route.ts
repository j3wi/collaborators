import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
function hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token'); if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
  const supabase = createAdminClient(); const tokenHash = hashToken(token)
  const { data: row, error } = await supabase.from('confirmation_tokens').select('id,cita_id,expires_at,used_at').eq('token_hash', tokenHash).single()
  if (error || !row) return NextResponse.json({ error: 'Enlace no válido' }, { status: 404 })
  if (row.used_at) return NextResponse.json({ message: 'Esta cita ya estaba confirmada.' })
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'Enlace caducado' }, { status: 410 })
  await supabase.from('citas').update({ estado: 'confirmada', confirmation_status: 'confirmada', confirmed_at: new Date().toISOString(), confirmation_method: 'email', confirmation_last_ip: request.headers.get('x-forwarded-for') ?? null }).eq('id', row.cita_id)
  await supabase.from('confirmation_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id)
  return new NextResponse('<html><body style="font-family:Arial;padding:40px"><h1>Cita confirmada</h1><p>Gracias. Tu cita ha quedado confirmada correctamente.</p></body></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
