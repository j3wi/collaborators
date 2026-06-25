import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Programa Cuentas Colaboradores', description: 'Agenda, recordatorios y liquidaciones' }
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html> }
