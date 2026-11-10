import { useEffect, useState } from 'react';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me').then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    }).then((data) => { if (active && data?.user) onAuthenticated(data.user); })
      .catch(() => { if (active) setError('Não foi possível conectar ao servidor local.'); });
    return () => { active = false; };
  }, [onAuthenticated]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message || 'Falha ao conectar ao servidor.');
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><span>⚽</span><p>MEMORIANO • NAÇÃO RUBRO-NEGRA</p></div>
        <h1>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1>
        <p className="auth-subtitle">Salve seu acesso e venha jogar!</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label>Nome<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required /></label>}
          <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required /></label>
          <label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 8 : 1} maxLength={72} required />{mode === 'register' && <small>Pelo menos 8 caracteres.</small>}</label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn primary auth-submit" type="submit" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
        </form>
        <p className="auth-switch">{mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Cadastre-se' : 'Fazer login'}</button></p>
        <p className="auth-local-note">Ambiente de testes local • SQLite</p>
      </section>
    </main>
  );
}
