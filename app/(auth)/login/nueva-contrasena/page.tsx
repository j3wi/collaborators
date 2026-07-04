import { NuevaContrasenaForm } from './form'

export default async function NuevaContrasenaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <main className="login-page">
      <NuevaContrasenaForm error={params.error} />
    </main>
  )
}
