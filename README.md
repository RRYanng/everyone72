# Everyone 72 — AI Golf Tracker

A mobile golf tracker that uses AI to diagnose why you're not improving and builds a personalized practice plan.

## Features

- **Hole-by-hole scorecard** — log strokes, putts, and trouble tags in under 30 seconds per hole
- **AI Diagnosis** — after 5+ rounds, Claude AI identifies your core weaknesses and root causes
- **Personalized practice plans** — specific weekly drills based on your actual data
- **500+ verified US courses** — with real course ratings and slope

## Data Integrity Over Coverage

**We deleted 272 courses with unverified hole-by-hole par data.**

Every course in this database has been individually researched and verified against official scorecards (bluegolf.com, USGA database, or club-published scorecards). We'd rather have 262 trustworthy courses than 534 questionable ones.

Why this matters: our AI analyzes your score relative to each hole's par. If hole #7 is listed as par 4 when it's actually par 5, every coaching insight for that hole is wrong. Garbage in, garbage out — and that's not acceptable for a product built around data-driven improvement.

Each verified course entry in `src/data/courses.ts` carries a `// Source:` comment showing where the par data came from.

If your home course isn't in the database yet, email **ruiyiyanng@gmail.com** with the course name and we'll add it with verified data.

## Tech Stack

- React Native / Expo
- TypeScript
- Supabase (PostgreSQL + Edge Functions + RLS)
- Anthropic Claude API (via Supabase Edge Function proxy)

## Running Locally

```bash
npm install
npx expo start
```

Requires a `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
