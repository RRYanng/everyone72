// ============================================================
// 练习照片(Supabase Storage,私有 bucket practice-photos)。
//
// bucket 是私有的,不能再用 /object/public/... 直链:
//   * 上传后数据库里存的是"路径"(<uid>/<时间戳>.jpg),不是 URL
//   * 显示时向 Storage 要一个签名 URL(1 小时有效);只有本人和已接受的好友有权限要到
//   * 迁移之前保存的 photo_url 是完整的公开 URL:这里从里面取出路径,同样走签名
//   * 上传前先在客户端检查大小和类型(服务端 bucket 也会强制,这里是为了给用户清楚的提示)
// ============================================================
import { supabase } from './supabase';

export const PHOTO_BUCKET = 'practice-photos';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;                    // 与 bucket 的 file_size_limit 一致
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const SIGNED_URL_TTL_S = 3600;
const CACHE_MS = (SIGNED_URL_TTL_S - 600) * 1000;                  // 提前 10 分钟换新的

// <uid>/<文件名>,不允许 .. 或多级目录
const PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+$/i;

export type PhotoSource =
  | { kind: 'storage'; path: string }
  | { kind: 'external'; url: string };

/** 把数据库里的 photo_url(路径,或迁移前的完整公开 URL)解析成要访问的东西。无法识别返回 null。 */
export function resolvePhotoSource(value: string | null | undefined): PhotoSource | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  if (/^https?:\/\//i.test(v)) {
    const marker = `/${PHOTO_BUCKET}/`;
    const i = v.lastIndexOf(marker);
    if (i === -1) return { kind: 'external', url: v };
    let path = v.slice(i + marker.length).split(/[?#]/)[0];
    try { path = decodeURIComponent(path); } catch { return null; }
    return PATH_RE.test(path) ? { kind: 'storage', path } : null;
  }
  return PATH_RE.test(v) ? { kind: 'storage', path: v } : null;
}

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

/** 清空签名缓存(退出登录 / 换账号时调用)。 */
export function clearPhotoCache(): void {
  cache.clear();
  inflight.clear();
}

/**
 * 拿到可以直接放进 <Image> 的 URL。
 * allowExternal 只给开发用的假数据(Unsplash 图片);真实数据里的外部链接一律不加载,
 * 避免别人把 photo_url 写成指向追踪地址的外链。
 */
export async function getPhotoUrl(
  value: string | null | undefined,
  opts: { allowExternal?: boolean } = {},
): Promise<string | null> {
  const src = resolvePhotoSource(value);
  if (!src) return null;
  if (src.kind === 'external') return opts.allowExternal ? src.url : null;

  const hit = cache.get(src.path);
  if (hit && hit.expires > Date.now()) return hit.url;

  const pending = inflight.get(src.path);
  if (pending) return pending;

  const p = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(src.path, SIGNED_URL_TTL_S);
      if (error || !data?.signedUrl) return null;
      cache.set(src.path, { url: data.signedUrl, expires: Date.now() + CACHE_MS });
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      inflight.delete(src.path);
    }
  })();
  inflight.set(src.path, p);
  return p;
}

/** 上传前检查;合格返回 null,否则返回给用户看的原因。 */
export function validatePhoto(file: { size?: number | null; type?: string | null }): string | null {
  if (typeof file.size === 'number' && file.size > MAX_PHOTO_BYTES) {
    return `That photo is too large (max ${MAX_PHOTO_BYTES / 1024 / 1024} MB).`;
  }
  const t = (file.type ?? '').toLowerCase();
  if (t && !ALLOWED_PHOTO_TYPES.includes(t)) {
    return 'That file type is not supported. Please use a JPEG, PNG, WebP or HEIC photo.';
  }
  return null;
}

/** 浏览器有时给不出 MIME 类型:没有就当 JPEG(文件名我们自己也是 .jpg)。 */
export function photoContentType(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase();
  return ALLOWED_PHOTO_TYPES.includes(t) ? t : 'image/jpeg';
}
