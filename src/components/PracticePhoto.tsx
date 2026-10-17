// 练习照片:向 Storage 要签名 URL 再显示(bucket 是私有的,见 lib/photos.ts)。
import React, { useEffect, useState } from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';
import { getPhotoUrl } from '../lib/photos';
import { isDevMockActive } from '../lib/mockUser';

export default function PracticePhoto({
  value, style, accessibilityLabel,
}: { value: string; style?: StyleProp<ImageStyle>; accessibilityLabel?: string }) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUri(null);
    getPhotoUrl(value, { allowExternal: isDevMockActive() }).then(u => { if (alive) setUri(u); });
    return () => { alive = false; };
  }, [value]);

  // 还没拿到 / 没权限 / 找不到:不显示(不留空白占位)
  if (!uri) return null;
  return <Image source={{ uri }} style={style} resizeMode="cover" accessibilityLabel={accessibilityLabel} />;
}
