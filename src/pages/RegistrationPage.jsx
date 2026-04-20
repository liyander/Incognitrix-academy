import { useEffect, useState } from 'react'
import { registerUser } from '../auth'
import { apiFetch } from '../services/api'

function RegistrationPage({ onRegisterSuccess }) {
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadConfig = async () => {
      try {
        const config = await apiFetch('/platform-config')
        if (!cancelled) {
          setRegistrationEnabled(Boolean(config?.features?.publicRegistration))
        }
      } catch {
        if (!cancelled) {
          setRegistrationEnabled(false)
        }
      }
    }

    void loadConfig()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!registrationNumber.trim() || !email.trim() || !password) {
      setError('All fields are required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const session = await registerUser({
        registrationNumber: registrationNumber.trim(),
        email: email.trim(),
        password,
      })

      if (!session) {
        setError('Unable to create account')
        return
      }

      onRegisterSuccess(session)
    } catch (registerError) {
      setError(registerError?.message || 'Unable to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <section className="w-full max-w-md bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 shadow-sm">
        <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary font-bold">
          Operator Registration
        </p>
        <h1 className="font-headline text-4xl font-bold tracking-tight mt-3 text-on-background uppercase">
          Join Incognitrix
        </h1>
        <p className="text-on-surface-variant mt-3 text-sm leading-relaxed">
          Create your operator account with your registration number and email.
        </p>

        {!registrationEnabled ? (
          <div className="mt-8 bg-error/10 border-l-4 border-error p-4">
            <p className="text-xs font-label tracking-wider uppercase text-error">
              Registration is currently disabled by admin.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Registration Number
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="INC-OP-1001"
                type="text"
                value={registrationNumber}
              />
            </label>

            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Email
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Password
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                type="password"
                value={password}
              />
            </label>

            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Confirm Password
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                type="password"
                value={confirmPassword}
              />
            </label>

            {error ? (
              <p className="text-xs font-label tracking-wider uppercase text-error">{error}</p>
            ) : null}

            <button
              className="w-full bg-primary text-on-primary py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default RegistrationPage
