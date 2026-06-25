export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = {
  public: {
    Tables: {
      profiles: { Row: any; Insert: any; Update: any }
      colaboradores: { Row: any; Insert: any; Update: any }
      supervisores: { Row: any; Insert: any; Update: any }
      pacientes: { Row: any; Insert: any; Update: any }
      servicios: { Row: any; Insert: any; Update: any }
      paciente_colaborador: { Row: any; Insert: any; Update: any }
      paciente_supervisor: { Row: any; Insert: any; Update: any }
      citas: { Row: any; Insert: any; Update: any }
      cita_pacientes: { Row: any; Insert: any; Update: any }
      cita_notas: { Row: any; Insert: any; Update: any }
      liquidaciones: { Row: any; Insert: any; Update: any }
      liquidacion_citas: { Row: any; Insert: any; Update: any }
      recordatorio_templates: { Row: any; Insert: any; Update: any }
      recordatorio_logs: { Row: any; Insert: any; Update: any }
      confirmation_tokens: { Row: any; Insert: any; Update: any }
      google_connections: { Row: any; Insert: any; Update: any }
      settings: { Row: any; Insert: any; Update: any }
      audit_log: { Row: any; Insert: any; Update: any }
    }
    Views: {}
    Functions: {}
    Enums: {
      app_role: 'admin' | 'supervisor' | 'colaborador' | 'paciente'
      cita_estado: 'programada' | 'confirmada' | 'realizada' | 'cancelada'
      pago_estado: 'pendiente' | 'pagada'
      liquidacion_estado: 'pendiente' | 'pagada'
    }
  }
}
