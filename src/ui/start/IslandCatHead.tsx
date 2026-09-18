import { useId } from 'react';
import { colaFaceContent } from '../icons/ColaFace';

/** 帐篷里的可乐：正头、无爱心的弯眼笑脸，与伙伴头像共用绘制。 */
export function IslandCatHead() {
  const clip = useId();
  return <g transform="translate(199 144) scale(.25)" dangerouslySetInnerHTML={{ __html: colaFaceContent(clip) }} />;
}
