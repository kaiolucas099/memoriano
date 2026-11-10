import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.js';
import { createSqliteSessionStore } from './sqlite-session-store.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ db = createDatabase(), sessionSecret = process.env.SESSION_SECRET || 'memoriano-local-dev-secret-change-me' } = {}) {
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    throw new Error('Configure SESSION_SECRET com pelo menos 32 caracteres no ambiente de produção.');
  }
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10kb' }));
  app.use(session({
    name: 'memoriano.sid',
    secret: sessionSecret,
    store: createSqliteSessionStore(db),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 }
  }));

  const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at });
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

  app.get('/api/health', (_req, res) => {
    try { db.prepare('SELECT 1').get(); return res.json({ ok: true, service: 'memoriano-api', database: 'sqlite' }); }
    catch { return res.status(503).json({ ok: false, service: 'memoriano-api' }); }
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'O nome deve ter entre 2 e 60 caracteres.' });
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Informe um e-mail válido.' });
      if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'A senha deve ter entre 8 e 72 caracteres.' });
      if (findByEmail.get(email)) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      const passwordHash = await bcrypt.hash(password, 12);
      const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, passwordHash);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      req.session.userId = user.id;
      return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      return next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const user = findByEmail.get(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      return res.json({ user: publicUser(user) });
    } catch (error) { return next(error); }
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Não autenticado.' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'Sessão inválida.' });
    return res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' });
      res.clearCookie('memoriano.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
      return res.json({ ok: true });
    });
  });

  const distPath = path.resolve(here, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distPath, 'index.html'), (error) => error && next(error));
  });
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(here, 'index.js')) {
  const app = createApp();
  const port = Number(process.env.PORT || 3001);
  app.listen(port, '0.0.0.0', () => console.log(`Memoriano ouvindo na porta ${port}`));
}
