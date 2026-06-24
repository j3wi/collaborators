import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function Home() {
  // 1. Log para verificar que Next.js lee las credenciales (¡nunca muestres la clave entera por seguridad!)
  console.log("--- COMPROBANDO CONEXIÓN ---")
  console.log("URL de Supabase configurada:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SÍ ✅" : "NO ❌")
  console.log("Clave Anon configurada:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SÍ ✅" : "NO ❌")

  // 2. Pedimos los datos capturing también el "error" si lo hubiera
  const { data: tareas, error } = await supabase.from('tareas').select('titulo')

  // 3. Log del resultado en la terminal
  if (error) {
    console.error("❌ ERROR DE SUPABASE:", error.message)
    console.error("Detalles del error:", error)
  } else {
    console.log("✅ DATOS RECIBIDOS DE SUPABASE:", tareas)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Mi App del Banco</h1>
      
      {/* SECCIÓN DE LOGS EN PANTALLA */}
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        
        {/* Si hay un error, lo pintamos en rojo */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded text-red-200 mb-4 font-mono text-sm">
            <p className="font-bold">Error de conexión:</p>
            <p>{error.message}</p>
            <p className="text-xs mt-2 text-red-400">Código: {error.code || "Desconocido"}</p>
          </div>
        )}

        {/* Si no hay error y hay tareas, las listamos */}
        {!error && tareas && tareas.length > 0 ? (
          tareas.map((tarea, index) => (
            <p key={index} className="text-xl text-green-400 font-mono">
              {tarea.titulo}
            </p>
          ))
        ) : null}

        {/* Si no hay error, pero la lista viene vacía */}
        {!error && tareas && tareas.length === 0 && (
          <p className="text-yellow-400 font-mono text-center">
            Conectado, pero la tabla 'tareas' está vacía.
          </p>
        )}
      </div>
    </main>
  )
}
