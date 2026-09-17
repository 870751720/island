/** 复制失败时保持拒绝语义，由界面提供适合当前内容的手动复制/保存入口。 */
export async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('当前浏览器不支持自动复制，请手动复制');
  await navigator.clipboard.writeText(text);
}
