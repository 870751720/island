import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SaveStore } from './store.ts';
import { createSaveServer } from './http.ts';

const directory = process.env.DATA_DIR || '/data';
mkdirSync(directory, { recursive: true });
const store = new SaveStore(join(directory, 'saves.sqlite'), process.env.SAVE_SECRET ?? '');
const server = createSaveServer(store, process.env.REVISION ?? 'local');
server.listen(Number(process.env.PORT || 3001), '0.0.0.0');
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { server.close(() => { store.close(); process.exit(0); }); });
}
