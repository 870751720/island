/** 房主/客人的玩法同步只依赖消息连接，不依赖具体传输方式。 */
export interface GameConnection {
  readonly connected: boolean;
  onMessage: (msg: unknown) => void;
  onClose: () => void;
  onOpen: () => void;
  send(msg: unknown): void;
  close(): void;
}
