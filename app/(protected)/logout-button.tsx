'use client'

import { useFormStatus } from 'react-dom'

export function LogoutButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="btn soft"
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={{ width: '100%', marginTop: 8 }}
    >
      {pending ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          Saliendo...
        </>
      ) : (
        'Salir'
      )}
    </button>
  )
}

