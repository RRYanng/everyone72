// ============================================================
// 应用内对话框队列(纯逻辑,不依赖 React Native,便于单测)。
//
// 网页上的 window.confirm / window.alert 在很多环境里不可用:内置浏览器、
// 部分应用内 WebView、被禁用弹窗的 iframe 里,confirm() 会直接返回 false 且不显示任何东西,
// 于是"确认"按钮看起来点了没反应。所以网页端改用应用内弹窗:
// dialog.ts 把请求推进这个队列,<DialogHost /> 取出第一条显示,用户点完再 settle。
// ============================================================

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  /** null = 只有一个按钮(提示框) */
  cancelLabel: string | null;
  destructive: boolean;
  resolve: (ok: boolean) => void;
}

export type DialogInput = Omit<DialogRequest, 'id' | 'resolve'>;

export function createDialogQueue() {
  const items: DialogRequest[] = [];
  const listeners = new Set<() => void>();
  let seq = 0;
  const emit = () => listeners.forEach(fn => fn());

  return {
    /** 排队显示一个对话框;用户确认 → true,取消/关闭 → false。 */
    push(input: DialogInput): Promise<boolean> {
      return new Promise<boolean>(resolve => {
        items.push({ ...input, id: ++seq, resolve });
        emit();
      });
    },
    /** 当前应该显示的那一条(队首)。 */
    current(): DialogRequest | null {
      return items[0] ?? null;
    },
    /** 结束队首并显示下一条。没有对话框时什么都不做。 */
    settle(ok: boolean): void {
      const r = items.shift();
      if (!r) return;
      r.resolve(ok);
      emit();
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    /** 有没有界面在监听(<DialogHost /> 是否已挂载)。 */
    hasHost(): boolean {
      return listeners.size > 0;
    },
    size(): number {
      return items.length;
    },
  };
}

export type DialogQueue = ReturnType<typeof createDialogQueue>;
