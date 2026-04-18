# Everyone 72

> An AI-powered golf diagnosis platform that tells you *why* you're not improving — not just *what* you scored.

![Status](https://img.shields.io/badge/status-deployed-success)
![Claude API](https://img.shields.io/badge/AI-Claude%20API-orange)
![Stack](https://img.shields.io/badge/stack-React%20Native%20%2B%20Supabase-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> *Part of a series exploring where AI augments human judgment (and where it shouldn't replace it). See also: [MakerLens](https://github.com/RRYanng/makerlens) · [Contract Analyser](https://github.com/RRYanng/contract-analyser)*

**🔗 [Try the live demo](https://everyone72.vercel.app/demo) · [Full app](https://everyone72.vercel.app)**

---

## Table of Contents

- [The Problem](#-the-problem)
- [What This Is](#-what-this-is)
- [Core Features](#-core-features)
- [Technical Architecture](#-technical-architecture)
- [Key Product Decisions](#-key-product-decisions)
- [Current Status](#-current-status)
- [Roadmap](#-roadmap)
- [Running Locally](#-running-locally)
- [About Me](#-about-me)

---

## 🎯 The Problem

Every golf app on the market — 18Birdies, Arccos, Golfshot — tells you *what* you scored. None of them tell you *why* you scored it or *how to fix it*.

I've played golf for 10 years. Handicap 15. I spend real money on rounds, lessons, and range sessions in Orange County. After years of using every tracking app available, I noticed they all had the same blind spot: **they record data but never close the loop on diagnosis.**

The market has plenty of scorecards. It has zero AI diagnosticians.

So I built one.

---

## 💡 What This Is

Everyone 72 is an AI-powered diagnosis platform that takes round-by-round scorecard data, identifies root causes of underperformance, and generates actionable practice plans.

Think of it as **AI medical imaging for your golf game**: it doesn't just show you the X-ray — it reads it, tells you what's wrong, and refers you to the right specialist.

Built solo from scratch as a full-stack production app. Not a tutorial clone. Not a fork. Deployed, live, and handling real user data.

---

## ⭐ Core Features

### Intelligent Scorecard System
Three-step input flow — strokes → putts → trouble tags (water, OB, bunker, rough, other) — designed for on-course speed. Trouble tagging is the key differentiator: it captures **context** that raw scores miss, enabling root-cause analysis no other app can do.

### AI Diagnosis Engine
After 5+ rounds, the system generates a multi-section diagnostic report powered by Claude API:

- **Core Issue** identification from cross-round pattern analysis
- **Data Evidence** with specific hole-by-hole citations
- **Root Cause** inference (decision-making vs. execution vs. course management)
- **Personalized Practice Plan** with priority-ranked drills

Each report is 80–120 words of actionable English prose — not generic tips, but specific observations tied to *your* data.

### 262 Verified Course Database
Originally launched with 500+ courses. During testing I discovered that the data generation pipeline was producing **fabricated hole-by-hole par values** (a hash-shuffle algorithm was silently filling in fake data). Caught the bug when a real course showed Hole 1 as Par 3 instead of the actual Par 4.

**Decision: deleted 272 unverified courses.** Removed the fallback algorithm entirely. Made `holes_par` a required field with no auto-generation. Shipped with 262 courses backed by real data from BlueGolf and USGA.

**Why this matters:** A single wrong par cascades into wrong scoring, wrong diagnosis, wrong practice recommendations. I chose credibility over vanity metrics.

### Data Visualization Suite
Four interactive charts providing visual insight into performance patterns:
- Score trend line (round-over-round progression)
- Trouble distribution breakdown (where strokes are lost)
- Par-type radar chart (Par 3 / 4 / 5 relative performance)
- Putting performance pie chart

### Social & Motivation Layer
- Practice check-ins with photo uploads
- Friend system with username search
- Practice feed + likes
- Leaderboard (ranked by practice frequency)
- Streak tracking + badge system (3-day / 7-day / 30-day)

### Golf Crew System
Private groups of up to 8 players via invite code. Intra-crew leaderboards and challenge system — designed to replicate the accountability of a real golf buddy group.

### Coach Matching Pipeline (In Progress)
"Want a coach to help you fix this?" prompt on the Diagnosis page collects emails into a `coach_waitlist` table. This validates the **AI diagnosis → human coach referral** business model before building a full marketplace.

---

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend                          │
│         React Native (Expo) + TypeScript             │
│              Deployed on Vercel                      │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│                   Backend                            │
│    Supabase (PostgreSQL + Auth + Storage + RLS)      │
│                                                      │
│    ┌────────────────────────────────────────┐        │
│    │     Supabase Edge Functions            │        │
│    │     (Claude API proxy layer)           │        │
│    └────────────────────────────────────────┘        │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│                 AI Layer                             │
│          Anthropic Claude API                        │
│    Multi-round diagnosis + coaching feedback        │
└──────────────────────────────────────────────────────┘
```

**Key technical decisions:**

- **Claude API calls routed through Supabase Edge Functions**, not called directly from the frontend. This keeps API keys server-side, enables rate limiting, and allows prompt engineering iteration without shipping app updates.
- **Row Level Security (RLS)** on all user-facing tables. Users can only read/write their own data — critical for a multi-user app handling personal performance data.
- **Trouble tags stored as structured data**, not free text. Enables aggregation, cross-round pattern detection, and visualization without NLP preprocessing.
- **No hash-shuffle fallback for course data.** After discovering fabricated par values, I removed all auto-generation. Every course record requires verified `holes_par` array. This broke the "easy path" but ensured every diagnosis is built on real data.

---

## 🧠 Key Product Decisions

### 1. Data Integrity > Data Volume

The hardest decision wasn't adding features — it was **deleting 272 courses** that had bad data. The app looked more impressive with 500+ courses. But one wrong par value cascades into a broken product experience.

I chose 262 real courses over 500+ mixed courses. "Data integrity > data volume" isn't just a lesson — it's now a design principle embedded in the codebase. The system literally cannot accept a course without verified hole data.

### 2. Structured Trouble Tags, Not Free Text

I could have let users type notes like "hit into water on the left." Instead I forced structured tags (water / OB / bunker / rough / other).

**Why:** Free text is a research rabbit hole, not a product. Structured tags make cross-round pattern detection trivial. The trade-off: I lose some narrative richness, but gain the ability to say "you've hit into water 7 times on Par 4 approaches in the last 5 rounds" — which is the actual diagnostic signal.

### 3. Edge Functions, Not Frontend API Calls

Every Claude API call goes through a Supabase Edge Function proxy, never directly from the React Native app. This adds latency (~200ms) but solves three problems simultaneously: API keys stay server-side, rate limiting is enforceable, and prompt engineering can iterate without app store review.

### 4. Coach Waitlist First, Marketplace Later

Instead of building a full coach marketplace, I shipped a single email-capture prompt on the Diagnosis page: "Want a coach to help you fix this?" Signups go into `coach_waitlist`.

This is a classic **fake door test**. If zero users opt in, the AI-to-coach referral business model doesn't exist. No need to build the marketplace. If signups are high, I have validated demand before writing the first line of marketplace code.

---

## 📊 Current Status

**Deployed to production on Vercel.** The app is live, handling real user data through Supabase with RLS enabled, and making Claude API calls via Edge Functions.

**Validation stage:**
- 🟢 Shipped end-to-end (auth → scorecard → AI diagnosis → social layer)
- 🟢 Early beta with a small group of testers from my Orange County golf network
- 🟡 Coach waitlist live, collecting signals for the referral model

This is at the "real thing, real users, real data" stage — but still early. The ROADMAP below is honest about what's next.

---

## 🗺️ Roadmap

Full roadmap in **[ROADMAP.md](./ROADMAP.md)**. High-level:

**Immediate (next 30 days)**
- Expand beta tester group from current network to 20+ regular users
- Instrument diagnostic report engagement (which sections get read, which get ignored)
- First cohort of coach waitlist signups → qualitative interviews

**Medium-term (60–90 days)**
- Validate AI → coach referral model via waitlist conversion
- Second round of feature prioritization based on beta feedback

**What I won't do:** Add features faster than the data justifies. The social layer and crew system already exist, but they won't see further investment unless active usage shows they move retention.

---

## 🚀 Running Locally

```bash
# Clone
git clone https://github.com/RRYanng/everyone72.git
cd everyone72

# Install
npm install

# Environment variables
cp .env.example .env
# Add your Supabase URL, Supabase Anon Key, and Anthropic API Key

# Start dev server
npx expo start --web
```

**Prerequisites:** Node.js 18+, npm, Expo CLI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) + TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| AI | Anthropic Claude API (via Edge Function proxy) |
| Deployment | Vercel (auto-deploy from `main`) |
| Data Sources | BlueGolf, USGA (262 verified US courses) |

---

## 💭 What I Took Away from Building This

**Full-stack ownership means no one to escalate to.** Auth flows, database schema design, RLS policies, Edge Function deployment, DNS configuration, CI/CD via Vercel — every layer is something I built, debugged, and maintain. When the registration flow broke in production, there was no backend team to escalate to. That discipline is hard to get from tutorials.

**Prompt engineering is product design.** Getting Claude to produce a consistent diagnostic report took many iterations — not because the model couldn't analyze golf data, but because the *output structure* had to match the user's actual reading pattern. 80–120 words, specific hole numbers, root cause before solution, drill recommendations ranked by priority. The instruction text was easy. The schema was the real work.

**Fake doors are cheaper than real doors.** The coach waitlist is a one-day build that tells me more about business viability than a one-month marketplace would.

---

## 👤 About Me

**Ruiyi (Alan) Yang** — UC Irvine Cognitive Science, exploring the intersection of AI product design and human judgment.

Built Everyone 72 because no existing app could tell me why I wasn't getting better. The lesson I took away: AI can compress a lot of the diagnostic work a good coach does, but the handoff to a real human is where the value is captured. That's the product thesis.

**Other projects in this series:**
- 🛡️ [Contract Analyser](https://github.com/RRYanng/contract-analyser) — AI legal risk agent for freelancers
- 🦉 [MakerLens](https://github.com/RRYanng/makerlens) — AI cold outreach with 3-layer anti-hallucination architecture

**Seeking:** Summer 2026 AI product / engineering internships.

- 📧 ruiyiyanng@gmail.com
- 🔗 [LinkedIn](https://linkedin.com/in/ruiyiyang)
- 🐙 [GitHub](https://github.com/RRYanng)
- 🌐 [Live Demo](https://everyone72.vercel.app/demo)
