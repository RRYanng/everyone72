# Everyone 72 — Roadmap

Historical validation plan, retained for context. These phases are unscheduled and do not describe current operational status.

**Status checked October 2, 2026:** the public sample demo is available. The original paused Supabase project has resumed; DNS, Auth health, and public course reads work. The AI function has been deployed, but its server-side AI key and a successful live response remain pending. Verifying actual authentication, scorecard persistence, and live AI analysis is a prerequisite to any beta expansion. Current user counts and waitlist activity have not been verified.

---

## Archived Plan: Early Validation

**What "done" looks like for this phase:**
- Active beta tester group of 20+ regular users (historical target; current count unverified)
- First cohort of coach waitlist signups → qualitative interviews
- Engagement data on the diagnostic report (which sections users actually read)

**Why this phase matters:** Earlier development targeted an end-to-end workflow; that hosted workflow still needs verification after backend recovery. This phase is about separating "the app technically works" from "real golfers keep coming back."

---

## Phase 1 — Expand and Instrument (unscheduled)

**Focus:** More users + better data on what's working.

- [ ] Grow beta from current network to 20+ regular users (target: people who log 2+ rounds per week)
- [ ] Instrument the diagnostic report page — which sections users scroll to, which they skip, where they drop off
- [ ] First qualitative interviews with coach waitlist signups: what problem do they think a coach would solve for them?

**Exit criteria:**
- 20+ active beta users logging rounds
- At least one clear signal about which part of the diagnosis is *actually* read vs. ignored
- 5+ coach waitlist interviews done

---

## Phase 2 — Validate the Referral Model (unscheduled)

**Focus:** Does AI diagnosis → coach referral actually convert?

- [ ] Test the coach referral flow end-to-end with real waitlist users + pilot coaches
- [ ] Track: % of diagnosis readers who click "find a coach" → % who complete the waitlist → % who'd pay
- [ ] Re-prioritize features based on Phase 1 engagement data (likely: double down on what's used, cut what isn't)

**Exit criteria:**
- Clear yes/no on whether AI → coach referral converts
- Feature set trimmed based on real usage, not intuition

---

## Phase 3 — Decision Point (unscheduled)

**Focus:** Scale, pivot, or pause.

Based on Phase 2 data:
- **Scale** if referral conversion is real → build the coach marketplace
- **Pivot** if referrals don't convert but engagement is high → find the business model
- **Pause** if engagement drops → document learnings, move on

---

## What I Won't Do (for now)

- **Add new features** beyond what Phase 1 users demonstrably need. The social layer and crew system already exist; they won't get further investment unless retention data shows they matter.
- **Push for volume marketing.** Early-stage apps don't need users, they need *the right users*. I'd rather have 20 golfers who log every round than 200 who log once and leave.
- **Build the coach marketplace speculatively.** The waitlist is a fake-door test. If it fails, no marketplace is needed.

---

## Possible Future Directions (not committed)

Only actionable after Phase 2 shows the core model works:

- **Coaching content library** — curated drill library tied to diagnosis output
- **Tournament / event scorecards** — different analysis pattern than casual rounds

---

## Kill Criteria

This project stops active development if:
- After a future 90-day validation period, no user logs 3+ rounds
- Coach waitlist conversion is 0% at a statistically meaningful sample (e.g., 50+ diagnostic views → 0 signups)
- The diagnostic report, when instrumented, shows <30% of users read past the first section

Public projects shouldn't quietly die. If any of the above hits, this doc will say so.

---

*Availability note updated: October 2, 2026; original plan: April 18, 2026 · [Ruiyi (Alan) Yang](https://github.com/RRYanng)*
