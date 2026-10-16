


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."init_user_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 用 service_role 权限绕过 RLS，直接插入
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 即使 user_stats 插入失败，也不能阻断 auth.users 的 INSERT
    -- 用户注册成功，user_stats 会在首次打卡时通过 upsert 补充创建
    RAISE WARNING '[init_user_stats] skipped for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."init_user_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_outing_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_outing uuid := coalesce(NEW.outing_id, OLD.outing_id); v_total int; v_status text; v_cnt int;
begin
  select slots_total, status into v_total, v_status from public.outings where id = v_outing;
  if v_status in ('cancelled','done') then return coalesce(NEW, OLD); end if;
  select count(*) into v_cnt from public.outing_members where outing_id = v_outing and status = 'joined';
  update public.outings set status = case when v_cnt >= v_total then 'full' else 'open' end
    where id = v_outing and status in ('open','full');
  return coalesce(NEW, OLD);
end; $$;


ALTER FUNCTION "public"."sync_outing_status"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."coach_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coach_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "state" "text",
    "course_rating" numeric(4,1),
    "slope_rating" integer,
    "total_par" integer DEFAULT 72,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crew_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "crew_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "challenge_type" "text" DEFAULT 'score'::"text",
    "target_value" numeric,
    "deadline" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crew_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crew_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "crew_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crew_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "emoji" "text" DEFAULT '⛳'::"text",
    "creator_id" "uuid" NOT NULL,
    "max_members" integer DEFAULT 8,
    "invite_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hole_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "hole_number" integer NOT NULL,
    "par" integer NOT NULL,
    "strokes" integer NOT NULL,
    "putts" integer DEFAULT 0 NOT NULL,
    "troubles" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."hole_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outing_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outing_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."outing_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outing_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outing_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'joined'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "outing_members_status_check" CHECK (("status" = ANY (ARRAY['joined'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."outing_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "course_id" "text" NOT NULL,
    "city" "text" NOT NULL,
    "play_date" "date" NOT NULL,
    "tee_time" time without time zone,
    "slots_total" integer NOT NULL,
    "skill_pref" "text" DEFAULT 'any'::"text" NOT NULL,
    "note" "text",
    "join_mode" "text" DEFAULT 'instant'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "outings_join_mode_check" CHECK (("join_mode" = ANY (ARRAY['instant'::"text", 'approve'::"text"]))),
    CONSTRAINT "outings_slots_total_check" CHECK ((("slots_total" >= 2) AND ("slots_total" <= 4))),
    CONSTRAINT "outings_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'full'::"text", 'cancelled'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."outings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text",
    "practice_tags" "text"[] DEFAULT '{}'::"text"[],
    "duration_minutes" integer,
    "ball_count" integer,
    "note" "text",
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "following_plan" boolean DEFAULT false
);


ALTER TABLE "public"."practice_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "round_id" "uuid",
    "plan_text" "text" NOT NULL,
    "week_start" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."practice_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "email" "text",
    "avatar_url" "text",
    "handicap" numeric(4,1),
    "years_playing" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "city" "text",
    "home_course_id" "text",
    "availability" "text"[],
    "bio" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practice_log_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'like'::"text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "text" NOT NULL,
    "date" "date",
    "tee_box" "text",
    "total_holes" integer DEFAULT 18,
    "total_strokes" integer,
    "total_putts" integer,
    "score_vs_par" integer,
    "ai_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scorecard_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "text" NOT NULL,
    "round_date" "date" NOT NULL,
    "draft_data" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scorecard_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "total_practices" integer DEFAULT 0,
    "last_practice_date" "date",
    "ai_plans_completed" integer DEFAULT 0,
    "badges" "jsonb" DEFAULT '[]'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."streak_leaderboard" AS
 SELECT "us"."user_id",
    "p"."username",
    "us"."current_streak",
    "us"."longest_streak",
    "us"."total_practices",
    "us"."badges"
   FROM ("public"."user_stats" "us"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "us"."user_id")))
  WHERE ("us"."current_streak" > 0)
  ORDER BY "us"."current_streak" DESC;


ALTER VIEW "public"."streak_leaderboard" OWNER TO "postgres";


ALTER TABLE ONLY "public"."coach_waitlist"
    ADD CONSTRAINT "coach_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crew_challenges"
    ADD CONSTRAINT "crew_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_crew_id_user_id_key" UNIQUE ("crew_id", "user_id");



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_friend_id_key" UNIQUE ("user_id", "friend_id");



ALTER TABLE ONLY "public"."hole_scores"
    ADD CONSTRAINT "hole_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outing_comments"
    ADD CONSTRAINT "outing_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outing_members"
    ADD CONSTRAINT "outing_members_outing_id_user_id_key" UNIQUE ("outing_id", "user_id");



ALTER TABLE ONLY "public"."outing_members"
    ADD CONSTRAINT "outing_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outings"
    ADD CONSTRAINT "outings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_logs"
    ADD CONSTRAINT "practice_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_practice_log_id_user_id_type_key" UNIQUE ("practice_log_id", "user_id", "type");



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scorecard_drafts"
    ADD CONSTRAINT "scorecard_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scorecard_drafts"
    ADD CONSTRAINT "scorecard_drafts_user_id_course_id_round_date_key" UNIQUE ("user_id", "course_id", "round_date");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id");



CREATE UNIQUE INDEX "coach_waitlist_email_idx" ON "public"."coach_waitlist" USING "btree" ("email");



CREATE INDEX "idx_crew_challenges_crew_id" ON "public"."crew_challenges" USING "btree" ("crew_id");



CREATE INDEX "idx_crew_members_crew_id" ON "public"."crew_members" USING "btree" ("crew_id");



CREATE INDEX "idx_crew_members_user_id" ON "public"."crew_members" USING "btree" ("user_id");



CREATE INDEX "idx_crews_invite_code" ON "public"."crews" USING "btree" ("invite_code");



CREATE INDEX "idx_friendships_friend_id" ON "public"."friendships" USING "btree" ("friend_id");



CREATE INDEX "idx_friendships_user_id" ON "public"."friendships" USING "btree" ("user_id");



CREATE INDEX "idx_hole_scores_round_id" ON "public"."hole_scores" USING "btree" ("round_id");



CREATE INDEX "idx_practice_logs_created_at" ON "public"."practice_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_practice_logs_user_id" ON "public"."practice_logs" USING "btree" ("user_id");



CREATE INDEX "idx_reactions_log_id" ON "public"."reactions" USING "btree" ("practice_log_id");



CREATE INDEX "idx_rounds_created_at" ON "public"."rounds" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_rounds_user_id" ON "public"."rounds" USING "btree" ("user_id");



CREATE INDEX "outing_comments_outing_idx" ON "public"."outing_comments" USING "btree" ("outing_id", "created_at");



CREATE INDEX "outing_members_outing_idx" ON "public"."outing_members" USING "btree" ("outing_id");



CREATE INDEX "outing_members_user_idx" ON "public"."outing_members" USING "btree" ("user_id");



CREATE INDEX "outings_city_status_idx" ON "public"."outings" USING "btree" ("city", "status", "play_date");



CREATE INDEX "outings_organizer_idx" ON "public"."outings" USING "btree" ("organizer_id");



CREATE INDEX "scorecard_drafts_user_idx" ON "public"."scorecard_drafts" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "outing_members_status_sync" AFTER INSERT OR DELETE OR UPDATE ON "public"."outing_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_outing_status"();



ALTER TABLE ONLY "public"."coach_waitlist"
    ADD CONSTRAINT "coach_waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crew_challenges"
    ADD CONSTRAINT "crew_challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crew_challenges"
    ADD CONSTRAINT "crew_challenges_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hole_scores"
    ADD CONSTRAINT "hole_scores_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outing_comments"
    ADD CONSTRAINT "outing_comments_outing_id_fkey" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outing_comments"
    ADD CONSTRAINT "outing_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outing_members"
    ADD CONSTRAINT "outing_members_outing_id_fkey" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outing_members"
    ADD CONSTRAINT "outing_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outings"
    ADD CONSTRAINT "outings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_logs"
    ADD CONSTRAINT "practice_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_practice_log_id_fkey" FOREIGN KEY ("practice_log_id") REFERENCES "public"."practice_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scorecard_drafts"
    ADD CONSTRAINT "scorecard_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can read courses" ON "public"."courses" FOR SELECT USING (true);



CREATE POLICY "Anyone can view reactions" ON "public"."reactions" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can update courses" ON "public"."courses" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can upsert courses" ON "public"."courses" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Insert own waitlist entry" ON "public"."coach_waitlist" FOR INSERT WITH CHECK (true);



CREATE POLICY "Read own waitlist entry" ON "public"."coach_waitlist" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own drafts" ON "public"."scorecard_drafts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own practice logs" ON "public"."practice_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reactions" ON "public"."reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert friend requests" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own drafts" ON "public"."scorecard_drafts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own hole scores" ON "public"."hole_scores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rounds"
  WHERE (("rounds"."id" = "hole_scores"."round_id") AND ("rounds"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own practice logs" ON "public"."practice_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own reactions" ON "public"."reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own rounds" ON "public"."rounds" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update friendship status" ON "public"."friendships" FOR UPDATE USING (("auth"."uid"() = "friend_id"));



CREATE POLICY "Users can update own drafts" ON "public"."scorecard_drafts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own practice logs" ON "public"."practice_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own rounds" ON "public"."rounds" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own and friends practice logs" ON "public"."practice_logs" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."status" = 'accepted'::"text") AND ((("friendships"."user_id" = "auth"."uid"()) AND ("friendships"."friend_id" = "practice_logs"."user_id")) OR (("friendships"."friend_id" = "auth"."uid"()) AND ("friendships"."user_id" = "practice_logs"."user_id"))))))));



CREATE POLICY "Users can view own drafts" ON "public"."scorecard_drafts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own friendships" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can view own hole scores" ON "public"."hole_scores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rounds"
  WHERE (("rounds"."id" = "hole_scores"."round_id") AND ("rounds"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own rounds" ON "public"."rounds" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "authenticated_can_create_crew" ON "public"."crews" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "challenge_creator_update" ON "public"."crew_challenges" FOR UPDATE USING (("auth"."uid"() = "created_by"));



ALTER TABLE "public"."coach_waitlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_can_delete_crew" ON "public"."crews" FOR DELETE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "creator_can_update_crew" ON "public"."crews" FOR UPDATE USING (("auth"."uid"() = "creator_id"));



ALTER TABLE "public"."crew_challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crew_member_create_challenge" ON "public"."crew_challenges" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."crew_members"
  WHERE (("crew_members"."crew_id" = "crew_challenges"."crew_id") AND ("crew_members"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."crew_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crew_members_can_view_crew" ON "public"."crews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crew_members"
  WHERE (("crew_members"."crew_id" = "crews"."id") AND ("crew_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "crew_members_view_challenges" ON "public"."crew_challenges" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crew_members"
  WHERE (("crew_members"."crew_id" = "crew_challenges"."crew_id") AND ("crew_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "crew_members_view_members" ON "public"."crew_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crew_members" "cm2"
  WHERE (("cm2"."crew_id" = "crew_members"."crew_id") AND ("cm2"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."crews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hole_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "joined member posts comment" ON "public"."outing_comments" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."outing_members" "m"
  WHERE (("m"."outing_id" = "m"."outing_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'joined'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."outings" "o"
  WHERE (("o"."id" = "outing_comments"."outing_id") AND ("o"."organizer_id" = "auth"."uid"())))))));



CREATE POLICY "organizer approves (update)" ON "public"."outing_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."outings" "o"
  WHERE (("o"."id" = "outing_members"."outing_id") AND ("o"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "organizer deletes outing" ON "public"."outings" FOR DELETE USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "organizer inserts outing" ON "public"."outings" FOR INSERT WITH CHECK (("auth"."uid"() = "organizer_id"));



CREATE POLICY "organizer updates outing" ON "public"."outings" FOR UPDATE USING (("auth"."uid"() = "organizer_id")) WITH CHECK (("auth"."uid"() = "organizer_id"));



ALTER TABLE "public"."outing_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outing_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practice_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practice_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_plans_own" ON "public"."practice_plans" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read comments (can see outing)" ON "public"."outing_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."outings" "o"
  WHERE (("o"."id" = "outing_comments"."outing_id") AND (("o"."organizer_id" = "auth"."uid"()) OR ("lower"("o"."city") = "lower"(( SELECT "p"."city"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."outing_members" "m"
          WHERE (("m"."outing_id" = "o"."id") AND ("m"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "read members (organizer or member)" ON "public"."outing_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."outings" "o"
  WHERE (("o"."id" = "outing_members"."outing_id") AND ("o"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."outing_members" "m2"
  WHERE (("m2"."outing_id" = "m2"."outing_id") AND ("m2"."user_id" = "auth"."uid"()))))));



CREATE POLICY "read outings (own/joined/same-city)" ON "public"."outings" FOR SELECT USING ((("auth"."uid"() = "organizer_id") OR (EXISTS ( SELECT 1
   FROM "public"."outing_members" "m"
  WHERE (("m"."outing_id" = "m"."id") AND ("m"."user_id" = "auth"."uid"())))) OR ("lower"("city") = "lower"(( SELECT "p"."city"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scorecard_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "self-leave or organizer-remove (delete)" ON "public"."outing_members" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."outings" "o"
  WHERE (("o"."id" = "outing_members"."outing_id") AND ("o"."organizer_id" = "auth"."uid"()))))));



CREATE POLICY "user joins (insert self)" ON "public"."outing_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_can_join_crew" ON "public"."crew_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_can_leave_crew" ON "public"."crew_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_stats_delete" ON "public"."user_stats" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_stats_insert" ON "public"."user_stats" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "user_stats_select_all" ON "public"."user_stats" FOR SELECT USING (true);



CREATE POLICY "user_stats_update" ON "public"."user_stats" FOR UPDATE USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."init_user_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."init_user_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."init_user_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_outing_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_outing_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_outing_status"() TO "service_role";



GRANT ALL ON TABLE "public"."coach_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."coach_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."crew_challenges" TO "anon";
GRANT ALL ON TABLE "public"."crew_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."crew_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."crew_members" TO "anon";
GRANT ALL ON TABLE "public"."crew_members" TO "authenticated";
GRANT ALL ON TABLE "public"."crew_members" TO "service_role";



GRANT ALL ON TABLE "public"."crews" TO "anon";
GRANT ALL ON TABLE "public"."crews" TO "authenticated";
GRANT ALL ON TABLE "public"."crews" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."hole_scores" TO "anon";
GRANT ALL ON TABLE "public"."hole_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."hole_scores" TO "service_role";



GRANT ALL ON TABLE "public"."outing_comments" TO "anon";
GRANT ALL ON TABLE "public"."outing_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."outing_comments" TO "service_role";



GRANT ALL ON TABLE "public"."outing_members" TO "anon";
GRANT ALL ON TABLE "public"."outing_members" TO "authenticated";
GRANT ALL ON TABLE "public"."outing_members" TO "service_role";



GRANT ALL ON TABLE "public"."outings" TO "anon";
GRANT ALL ON TABLE "public"."outings" TO "authenticated";
GRANT ALL ON TABLE "public"."outings" TO "service_role";



GRANT ALL ON TABLE "public"."practice_logs" TO "anon";
GRANT ALL ON TABLE "public"."practice_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_logs" TO "service_role";



GRANT ALL ON TABLE "public"."practice_plans" TO "anon";
GRANT ALL ON TABLE "public"."practice_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_plans" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reactions" TO "anon";
GRANT ALL ON TABLE "public"."reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reactions" TO "service_role";



GRANT ALL ON TABLE "public"."rounds" TO "anon";
GRANT ALL ON TABLE "public"."rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."rounds" TO "service_role";



GRANT ALL ON TABLE "public"."scorecard_drafts" TO "anon";
GRANT ALL ON TABLE "public"."scorecard_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."scorecard_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."streak_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."streak_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."streak_leaderboard" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







