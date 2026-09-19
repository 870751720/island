/** Verify the public TLS/WebSocket route and MQTT CONNACK, without creating a room. */
export function verifySignaling(url = 'wss://43.110.116.98/signaling'): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, 'mqtt');
    socket.binaryType = 'arraybuffer';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Signaling health check timed out')), 10_000);
    socket.onopen = () => {
      const id = new TextEncoder().encode(`health-${crypto.randomUUID()}`);
      // MQTT 3.1.1 CONNECT: clean session, ten-second keepalive, unique client ID.
      socket.send(new Uint8Array([
        0x10, 12 + id.length, 0, 4, 77, 81, 84, 84, 4, 2, 0, 10,
        0, id.length, ...id,
      ]));
    };
    socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const bytes = new Uint8Array(event.data);
      if (bytes.length === 4 && bytes[0] === 0x20 && bytes[1] === 2 && bytes[2] === 0 && bytes[3] === 0) finish();
      else finish(new Error('Signaling broker rejected health connection'));
    };
    socket.onerror = () => finish(new Error('Signaling WebSocket connection failed'));
    socket.onclose = () => finish(new Error('Signaling connection closed before CONNACK'));
  });
}
