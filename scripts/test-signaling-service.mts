import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mqtt, { type MqttClient } from 'mqtt';
import { verifySignaling } from '../signaling/verify.ts';

const url = process.argv[2] ?? 'wss://43.110.116.98/signaling';
await verifySignaling(url);
const clients: MqttClient[] = [];
const room = `health-${randomUUID()}`;
const up = `island-game/v1/${room}/up`;
const down = `island-game/v1/${room}/down/${randomUUID()}`;

async function connect(): Promise<MqttClient> {
  const client = mqtt.connect(url, {
    clientId: `health-${randomUUID()}`, clean: true, reconnectPeriod: 0,
    connectTimeout: 10_000, protocolVersion: 4,
  });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
    client.once('close', () => reject(new Error('Signaling connection closed')));
  });
  return client;
}

async function exchange(sender: MqttClient, receiver: MqttClient, topic: string, payload: object): Promise<void> {
  const expected = JSON.stringify(payload);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Signaling delivery timed out')), 10_000);
    const received = (actualTopic: string, data: Buffer) => {
      if (actualTopic !== topic) return;
      try { assert.equal(data.toString(), expected); finish(); }
      catch (error) { finish(error as Error); }
    };
    const finish = (error?: Error | null) => {
      clearTimeout(timer);
      receiver.removeListener('message', received);
      if (error) reject(error);
      else resolve();
    };
    receiver.on('message', received);
    sender.publish(topic, expected, { qos: 0, retain: false }, error => { if (error) finish(error); });
  });
}

try {
  const host = await connect();
  const guest = await connect();
  await host.subscribeAsync(up);
  await guest.subscribeAsync(down);
  await exchange(guest, host, up, { type: 'join', peer: 'health' });
  await exchange(host, guest, down, { type: 'ready' });
  await exchange(host, guest, down, { type: 'signal', data: { description: { type: 'offer', sdp: 'health' } } });
  await exchange(guest, host, up, { type: 'signal', peer: 'health', data: { description: { type: 'answer', sdp: 'health' } } });
  await exchange(guest, host, up, { type: 'signal', peer: 'health', data: { candidate: { candidate: 'health' } } });
  console.log('Public signaling TLS, MQTT and two-client room exchange passed');
} finally {
  for (const client of clients) client.end(true);
}
