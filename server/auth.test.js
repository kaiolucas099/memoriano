import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from './index.js';

function setup() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return { db, app: createApp({ db, sessionSecret: 'test-session-secret' }) };
}

test('health endpoint reports SQLite API', async () => {
  const { app } = setup();
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.database, 'sqlite');
});

test('registers user, hashes password and maintains session', async () => {
  const { app, db } = setup();
  const agent = request.agent(app);
  const created = await agent.post('/api/auth/register').send({ name: 'Kaio Teste', email: 'KAIO@example.com', password: 'senha-segura-123' });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, 'kaio@example.com');
  assert.equal('password_hash' in created.body.user, false);
  const stored = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('kaio@example.com');
  assert.notEqual(stored.password_hash, 'senha-segura-123');
  assert.equal((await agent.get('/api/auth/me')).status, 200);
  assert.equal((await agent.post('/api/auth/logout')).status, 200);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});

test('rejects duplicate email and weak password', async () => {
  const { app } = setup();
  await request(app).post('/api/auth/register').send({ name: 'Teste', email: 'teste@example.com', password: 'senha-segura-123' }).expect(201);
  await request(app).post('/api/auth/register').send({ name: 'Outro', email: 'TESTE@example.com', password: 'senha-segura-123' }).expect(409);
  await request(app).post('/api/auth/register').send({ name: 'Teste', email: 'fraco@example.com', password: '123' }).expect(400);
});

test('rejects invalid login', async () => {
  const { app } = setup();
  await request(app).post('/api/auth/login').send({ email: 'naoexiste@example.com', password: 'senha-errada' }).expect(401);
});
