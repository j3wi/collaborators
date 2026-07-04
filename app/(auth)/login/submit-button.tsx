'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button className="btn primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          Entrando...
        </>
      ) : (
        'Entrar'
      )}
    </button>
  )
}

