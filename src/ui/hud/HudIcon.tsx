import { INTERFACE_SVG } from '../icons/InterfaceIcons';

export type HudIconName = keyof typeof INTERFACE_SVG;

export function HudIcon({ name, size = 24 }: { name: HudIconName; size?: number }) {
  return <span aria-hidden="true" style={{ display: 'inline-flex', width: size, height: size, flex: 'none' }} dangerouslySetInnerHTML={{ __html: INTERFACE_SVG[name] }} />;
}
