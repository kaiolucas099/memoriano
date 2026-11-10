import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Auth from './Auth.jsx';
import './styles.css';
import './auth.css';

function Root() {
  const [user, setUser] = useState(null);
  const handleAuthenticated = useCallback((nextUser) => setUser(nextUser), []);
  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { setUser(null); }
  }, []);
  return user
    ? <App user={user} onLogout={logout} />
    : <Auth onAuthenticated={handleAuthenticated} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
