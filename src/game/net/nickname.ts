/** 昵称持久化:加入房间时输入即记住,之后创建房间当房主也用同一个名字 */
const NICKNAME_KEY = 'island.nickname';

export function loadNickname(): string {
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem(NICKNAME_KEY) ?? '').trim().slice(0, 8);
}

export function saveNickname(raw: string) {
  if (typeof window === 'undefined') return;
  const name = raw.trim().slice(0, 8);
  if (name) window.localStorage.setItem(NICKNAME_KEY, name);
}
