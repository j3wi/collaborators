'use client'

import { useState } from 'react'
import { borrarColaborador } from './actions'

type ConfirmarBorradoModalProps = {
  colaboradorId: string
  colaboradorNombre: string
  citasCount: number
}

export function ConfirmarBorradoModal({
  colaboradorId,
  colaboradorNombre,
  citasCount,
}: ConfirmarBorradoModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('id', colaboradorId)
      await borrarColaborador(formData)
      setIsSubmitting(false)
      setIsOpen(false)
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Error al desactivar')
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn danger"
        onClick={() => setIsOpen(true)}
      >
        Borrar
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>Confirmar desactivación</h2>
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              ¿Estás seguro de que quieres desactivar a <strong>{colaboradorNombre}</strong>?
            </p>
            {error && (
              <div
                style={{
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#721c24',
                  fontSize: '13px',
                }}
              >
                <strong>❌ Error:</strong> {error}
              </div>
            )}
            {citasCount > 0 && (
              <div
                style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#856404',
                  fontSize: '13px',
                }}
              >
                <strong>⚠️ Aviso:</strong> Este colaborador tiene <strong>{citasCount} cita{citasCount !== 1 ? 's' : ''}</strong> pendiente{citasCount !== 1 ? 's' : ''}. Se desactivará pero las citas se mantendrán.
              </div>
            )}
            <p style={{ marginBottom: '20px', fontSize: '13px', color: '#999' }}>
              Podrás crear un nuevo usuario con el mismo nombre en el futuro.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn soft"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <form onSubmit={handleSubmit} style={{ display: 'inline' }}>
                <input type="hidden" name="id" value={colaboradorId} />
                <button
                  type="submit"
                  className="btn danger"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Desactivando...' : 'Desactivar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}




