import { useEffect, useMemo, useState } from 'react'
import CasAuthButton from '../components/CasAuthButton'

type SessionUser = {
  pid: string
  email: string
  name: string
}

function CasPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('Checking current session...')

  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser])

  async function loadCurrentUser() {
    setLoading(true)
    setStatusMessage('Checking current session...')

    try {
      const response = await fetch('/api/currentUser', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.status === 401) {
        setCurrentUser(null)
        setStatusMessage('Not authenticated')
        return
      }

      if (!response.ok) {
        setCurrentUser(null)
        setStatusMessage('Failed to read current user')
        return
      }

      const data = await response.json()
      setCurrentUser(data.user ?? null)
      setStatusMessage('Authenticated session found')
    } catch {
      setCurrentUser(null)
      setStatusMessage('Failed to read current user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentUser()
  }, [])

  function handleAuthClick() {
    const returnTo = encodeURIComponent('/cas')
    const endpoint = isAuthenticated
      ? `/api/logout?returnTo=${returnTo}`
      : `/api/login?returnTo=${returnTo}`
    window.location.href = endpoint
  }

  return (
    <div>
      <h1>CAS</h1>

      <CasAuthButton
        mode={isAuthenticated ? 'logout' : 'login'}
        onClick={handleAuthClick}
        disabled={loading}
      />

      <p>{statusMessage}</p>

      <h2>Current User</h2>
      <pre>{JSON.stringify(currentUser, null, 2)}</pre>
    </div>
  )
}

export default CasPage
