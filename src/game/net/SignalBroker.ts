import mqtt, { type MqttClient } from 'mqtt';

export const SIGNAL_BROKERS = ['wss://43.110.116.98/signaling', 'wss://broker.emqx.io:8084/mqtt'] as const;
export const SIGNAL_TIMEOUT = 10_000;

export function randomSignalId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => String(byte % 10)).join('');
}

/** 连接与订阅分别限时；取消时同步结束等待，避免旧尝试影响重试。 */
function waitForBroker(
  client: MqttClient,
  abort: AbortSignal,
  operation: (done: (error?: Error | null) => void) => () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abort.aborted) { reject(new Error('已取消连接')); return; }
    let cleanup = () => {};
    let settled = false;
    const finish = (error?: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      abort.removeEventListener('abort', cancelled);
      client.removeListener('error', failed);
      client.removeListener('close', disconnected);
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const cancelled = () => finish(new Error('已取消连接'));
    const failed = (error: Error) => finish(error);
    const disconnected = () => finish(new Error('联机服务连接中断'));
    const timer = setTimeout(() => finish(new Error('联机服务响应超时')), SIGNAL_TIMEOUT);
    abort.addEventListener('abort', cancelled, { once: true });
    client.on('error', failed);
    client.on('close', disconnected);
    try {
      cleanup = operation(finish);
      if (settled) cleanup();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function connectSignalBroker(
  role: 'host' | 'guest', abort: AbortSignal, url: string = SIGNAL_BROKERS[0],
): Promise<MqttClient> {
  if (abort.aborted) throw new Error('已取消连接');
  const client = mqtt.connect(url, {
    clean: true,
    clientId: `island_${role}_${randomSignalId(12)}`,
    connectTimeout: SIGNAL_TIMEOUT,
    keepalive: 30,
    reconnectPeriod: role === 'host' ? 5000 : 0,
    protocolVersion: 4,
  });
  // 连接完成后的错误由会话的 close / 自动重连处理。
  client.on('error', () => {});
  try {
    await waitForBroker(client, abort, (done) => {
      const connected = () => done();
      client.once('connect', connected);
      return () => { client.removeListener('connect', connected); };
    });
    if (abort.aborted) throw new Error('已取消连接');
    return client;
  } catch (error) {
    client.end(true);
    throw error;
  }
}

export function subscribeSignalBroker(client: MqttClient, topic: string, abort: AbortSignal): Promise<void> {
  return waitForBroker(client, abort, (done) => {
    client.subscribe(topic, { qos: 0 }, (error, granted) => {
      done(error || (granted?.some((entry) => entry.qos === 128) ? new Error('订阅房间失败') : undefined));
    });
    return () => {};
  });
}
