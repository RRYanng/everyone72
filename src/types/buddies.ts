// ============================================================
// 搭子/约局(Golf Buddies & Outings)—— 本功能所有 TS 类型集中放这
// 与 supabase/buddies_schema.sql 的字段、枚举严格对齐。
// ============================================================

export type Availability = '工作日早' | '工作日晚' | '周末早' | '周末午';

export interface ProfileExtras {
  city: string | null;
  home_course_id: string | null;
  availability: Availability[] | null;
  bio: string | null;
}

export type JoinMode = 'instant' | 'approve';
export type OutingStatus = 'open' | 'full' | 'cancelled' | 'done';
export type MemberStatus = 'joined' | 'pending';

export interface Outing {
  id: string;
  organizer_id: string;
  course_id: string;
  city: string;
  play_date: string;   // YYYY-MM-DD
  tee_time: string | null;
  slots_total: number;
  skill_pref: string;
  note: string | null;
  join_mode: JoinMode;
  status: OutingStatus;
  created_at: string;
}

export interface OutingMember {
  id: string;
  outing_id: string;
  user_id: string;
  status: MemberStatus;
  joined_at: string;
}

export interface OutingComment {
  id: string;
  outing_id: string;
  user_id: string;
  body: string;
  created_at: string;
}
