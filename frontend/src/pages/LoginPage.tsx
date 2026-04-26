import { useEffect, useState } from 'react';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/currentUser', {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            window.location.href = '/';
            return;
          }
        }
      } catch {}

      setLoading(false);
    }

    checkUser();
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/login?returnTo=/';
  };

  if (loading) return <div className="login-page">Loading...</div>;

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>EZSpot</h1>
        <p>
          Sign in through VT CAS below.
        </p>
        <button onClick={handleLogin}>Log In</button>
      </div>
    </div>
  );
}