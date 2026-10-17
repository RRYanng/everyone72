// 登录 / 注册页的响应式尺寸计算(纯函数,便于单测)。
//
// 两种布局:
//   split   ≥ 720px:左边插画面板、右边表单(不对称分栏)
//   stacked < 720px:顶部插画带 + 居中的表单列
//
// 插画带的高度随宽度增长:晨光 + 光晕在插画里占 y∈[69,211] 这一段,窗口宽 W、高 H 时
// 可见范围是 400·H/W 个单位,至少要 ~210 个单位才不会把太阳截掉,所以 H ≥ 0.525·W。
// (之前固定 232px,宽度超过 ~440px 后太阳就被截掉一半。)

export const SPLIT_BREAKPOINT = 720;
export const BAND_MIN_HEIGHT = 232;
export const BAND_MAX_HEIGHT = 400;
export const STACKED_COLUMN_MAX_WIDTH = 440;

export type AuthLayout =
  | { mode: 'split'; formPaddingLeft: number; formPaddingRight: number; artPadding: number }
  | { mode: 'stacked'; bandHeight: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function authLayout(width: number): AuthLayout {
  if (width >= SPLIT_BREAKPOINT) {
    return {
      mode: 'split',
      // 左侧留得比右侧多一点:不对称,但窄屏下不会把表单挤没
      formPaddingLeft: clamp(Math.round(width * 0.055), 28, 88),
      formPaddingRight: 28,
      artPadding: clamp(Math.round(width * 0.03), 28, 48),
    };
  }
  return {
    mode: 'stacked',
    bandHeight: clamp(Math.round(width * 0.55), BAND_MIN_HEIGHT, BAND_MAX_HEIGHT),
  };
}
