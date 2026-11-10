import session from 'express-session';

export function createSqliteSessionStore(db) {
  class SqliteSessionStore extends session.Store {
    constructor() {
      super();
      this.getStatement = db.prepare('SELECT sess, expired_at FROM sessions WHERE sid = ?');
      this.setStatement = db.prepare('INSERT INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired_at = excluded.expired_at');
      this.destroyStatement = db.prepare('DELETE FROM sessions WHERE sid = ?');
      this.touchStatement = db.prepare('UPDATE sessions SET expired_at = ? WHERE sid = ?');
      this.pruneStatement = db.prepare('DELETE FROM sessions WHERE expired_at <= ?');
    }
    get(sid, callback) {
      try {
        const row = this.getStatement.get(sid);
        if (!row) return callback(null, null);
        if (row.expired_at <= Date.now()) {
          this.destroyStatement.run(sid);
          return callback(null, null);
        }
        return callback(null, JSON.parse(row.sess));
      } catch (error) { return callback(error); }
    }
    set(sid, sess, callback = () => {}) {
      try {
        const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
        this.setStatement.run(sid, JSON.stringify(sess), expires);
        this.pruneStatement.run(Date.now());
        callback(null);
      } catch (error) { callback(error); }
    }
    destroy(sid, callback = () => {}) {
      try { this.destroyStatement.run(sid); callback(null); }
      catch (error) { callback(error); }
    }
    touch(sid, sess, callback = () => {}) {
      try {
        const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
        this.touchStatement.run(expires, sid);
        callback(null);
      } catch (error) { callback(error); }
    }
  }
  return new SqliteSessionStore();
}
