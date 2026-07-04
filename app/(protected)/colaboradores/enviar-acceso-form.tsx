'use client'

import { useActionState } from 'react'
import { reenviarAccesoColaborador, type ReenviarAccesoState } from './actions'

const initialState: ReenviarAccesoState = null

export function EnviarAccesoForm({ colaboradorId }: { colaboradorId: string }) {
  const [state, formAction, pending] = useActionState(reenviarAccesoColaborador, initialState)

  return (
    <form action={formAction} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input type="hidden" name="id" value={colaboradorId} />
      <button className="btn soft" type="submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar acceso'}
      </button>
      {state?.message && (
        <span className={`tag ${state.ok ? 'ok' : 'danger'}`} aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  )
}

