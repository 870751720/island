import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';

/** One durable row per code; replacement is a single atomic SQLite statement. */
export class SaveStore {
  private db: DatabaseSync;
  private secret: string;
  constructor(filename: string, secret: string) {
    if (secret.length < 32) throw new Error('SAVE_SECRET must contain at least 32 characters');
    this.secret = secret;
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  }
  private id(code: string): string { return createHmac('sha256', this.secret).update(code).digest('hex'); }
  get(code: string): string | undefined {
    return (this.db.prepare('SELECT body FROM saves WHERE id = ?').get(this.id(code)) as { body: string } | undefined)?.body;
  }
  put(code: string, body: string): void {
    this.db.prepare('INSERT INTO saves (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(this.id(code), body);
  }
  close(): void { this.db.close(); }
}
