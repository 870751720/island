import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '荒岛求生',
  description: '2.5D 荒岛求生游戏',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
