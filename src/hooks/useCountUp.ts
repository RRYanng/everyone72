// 数字从 0 滚动到目标值的动画 hook
// 用 requestAnimationFrame 实现 easeOut 效果
import { useState, useEffect, useRef } from 'react';

export function useCountUp(target: number | null, duration = 700): number | null {
  const [value, setValue] = useState<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === null) return;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOut cubic — 快进慢出
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return target !== null ? value : null;
}
