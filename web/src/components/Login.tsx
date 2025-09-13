import React, { useState } from 'react'
import { signInWithHandle, createAccount } from '../lib/supabase'

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // For demo, use the default org ID
        await createAccount(handle, password, displayName, '550e8400-e29b-41d4-a716-446655440000')
        alert('Account creato! Ora puoi accedere.')
        setIsSignUp(false)
      } else {
        await signInWithHandle(handle, password)
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isSignUp ? 'Crea Account' : 'Accedi'}
          </h2>
          <p className="mt-2 text-gray-600">
            Ufficio Virtuale - Chat Aziendale
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-700">
                Handle (es. nome.cognome)
              </label>
              <input
                id="handle"
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                className="input-field mt-1"
                placeholder="mario.rossi"
                pattern="[a-z]+\.[a-z]+"
                title="Formato richiesto: nome.cognome"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                  Nome Completo
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Mario Rossi"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1"
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? 'Caricamento...' : (isSignUp ? 'Crea Account' : 'Accedi')}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full btn-secondary"
            >
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>
        </form>

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Demo accounts:</p>
          <p>mario.rossi / demo123!</p>
          <p>anna.verdi / demo123!</p>
        </div>
      </div>
    </div>
  )
}

export default Login
