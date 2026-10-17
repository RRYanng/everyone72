// 应用字体:Cormorant(衬线,Japandi 登录/注册页的标题用)。
// 只加载用到的三个字重,避免把整个字体家族打进包里。
// 逐个字重按子路径导入:从包的根入口导入会让打包器把全部 10 个字重都打进去(约 10MB)
import { Cormorant_300Light } from '@expo-google-fonts/cormorant/300Light';
import { Cormorant_400Regular } from '@expo-google-fonts/cormorant/400Regular';
import { Cormorant_400Regular_Italic } from '@expo-google-fonts/cormorant/400Regular_Italic';

export const APP_FONTS = {
  Cormorant_300Light,
  Cormorant_400Regular,
  Cormorant_400Regular_Italic,
};

/** 字体最多等这么久;超时就用后备衬线字体先显示,不让用户对着空白屏等。 */
export const FONT_LOAD_TIMEOUT_MS = 3000;
