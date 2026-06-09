// ============================================================
// 球友档案扩展字段(city / home_course_id / availability / bio)读写数据层
// 对应 profiles 表在 buddies_schema.sql 中新增的字段。
// ============================================================

import { supabase } from './supabase';
import { ProfileExtras } from '../types/buddies';

export async function getProfileExtras(userId: string): Promise<ProfileExtras | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('city, home_course_id, availability, bio')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileExtras;
}

export async function saveProfileExtras(userId: string, extras: ProfileExtras): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      city: extras.city,
      home_course_id: extras.home_course_id,
      availability: extras.availability,
      bio: extras.bio,
    })
    .eq('id', userId);
  return !error;
}

/** 城市是约局/看局的硬门槛 */
export async function hasCity(userId: string): Promise<boolean> {
  const e = await getProfileExtras(userId);
  return !!e?.city && e.city.trim().length > 0;
}
