import { createRelayService } from './service.ts';

const service = createRelayService();
service.server.listen(3002, '0.0.0.0', () => console.log('Island relay listening on 3002'));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void service.close().then(() => process.exit(0)); });
}
