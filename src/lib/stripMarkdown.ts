// 轻量 markdown → 纯文本清洗
// 用于"预览型"卡片（numberOfLines 截断、无需样式），保留内容、丢弃语法符号。
// 完整 markdown 渲染请使用 react-native-markdown-display 等库。

export function stripMarkdown(input: string): string {
  if (!input) return '';
  return input
    // 去掉 fenced code block（```...```）的围栏，保留内容
    .replace(/```[a-zA-Z]*\n?/g, '')
    // 行首的 heading 记号（# ~ ######）
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // 行首的无序/有序列表记号（- * + / 1. 2.）
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 引用块
    .replace(/^\s*>\s+/gm, '')
    // 粗体 **text** / __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 斜体 *text* / _text_（注意排除列表记号与双字符）
    .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1$2$3')
    .replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1$2$3')
    // 行内代码 `text`
    .replace(/`([^`]+)`/g, '$1')
    // 链接 [label](url) → label
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // 水平分割线
    .replace(/^\s*([-*_]){3,}\s*$/gm, '')
    // 连续空白压缩成单个空格
    .replace(/\s+/g, ' ')
    .trim();
}
