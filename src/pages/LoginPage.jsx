import { useState } from 'react'
import { TEMP_USERS, loginUser } from '../auth'

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const session = await loginUser(username.trim(), password)
      if (!session) {
        setError('Invalid credentials. Please try again.')
        return
      }

      setError('')
      onLoginSuccess(session)
    } catch (loginError) {
      setError(loginError?.message || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <section className="w-full max-w-md bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 shadow-sm">
        <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary font-bold">
          Secure Access
        </p>
        <h1 className="font-headline text-4xl font-bold tracking-tight mt-3 text-on-background uppercase">
          Operator Login
        </h1>
        <p className="text-on-surface-variant mt-3 text-sm leading-relaxed">
          Authenticate to access Incognitrix Academy modules and operator assets.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Username
            </span>
            <input
              className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER_USERNAME"
              type="text"
              value={username}
            />
          </label>

          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Password
            </span>
            <input
              className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER_PASSWORD"
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="text-xs font-label tracking-wider uppercase text-error">{error}</p>
          ) : null}

          <button
            className="w-full bg-primary text-on-primary py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors"
            type="submit"
          >
            Authenticate
          </button>
        </form>

        <div className="mt-7 border-t border-outline-variant/30 pt-4">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
            Temporary Credentials
          </p>
          {TEMP_USERS.map((user) => (
            <div className="mt-2" key={user.username}>
              <p className="text-xs text-on-surface">role: {user.role}</p>
              <p className="text-xs text-on-surface">username: {user.username}</p>
              <p className="text-xs text-on-surface">password: {user.password}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default LoginPage
