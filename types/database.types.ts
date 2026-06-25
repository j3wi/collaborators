// Tipos de la base de datos para Supabase.
// Placeholder con any para evitar errores de tipado hasta generar con supabase gen types.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, {
      Row: Record<string, any>
      Insert: Record<string, any>
      Update: Record<string, any>
      Relationships: { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }[]
    }>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: 'admin' | 'supervisor' | 'colaborador' | 'paciente'
      cita_estado: 'programada' | 'confirmada' | 'realizada' | 'cancelada'
      pago_estado: 'pendiente' | 'pagada'
      liquidacion_estado: 'pendiente' | 'pagada'
    }
  }
}
