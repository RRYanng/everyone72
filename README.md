# Everyone 72

A golf coaching prototype that connects hole-by-hole scorecards, performance charts, and AI-assisted diagnosis. Built by Ruiyi (Alan) Yang.

**[Public sample demo](https://everyone72.vercel.app/demo) · [Project website](https://everyone72.vercel.app/) · [Source code](https://github.com/RRYanng/everyone72)**

## Current availability

Checked October 2, 2026:

- **Public repository:** accessible without a GitHub account.
- **Public sample demo:** renders charts and an illustrative report without signing in. The values and report are fixed examples in [DemoScreen.tsx](src/screens/demo/DemoScreen.tsx); this page does not call Claude or read live user data.
- **Backend recovery:** the original Supabase project was paused and has now resumed. Its hostname resolves, the Auth health endpoint responds, and the public courses API is readable. The hosted frontend and local configuration point to the same project.
- **Account verification:** successful sign-in with the owner's authorized test account, saving scorecards, and retrieving that account's data remain unverified. No mock account was used as proof.
- **Live AI:** the previously missing `analyze-round` Edge Function is now deployed. CORS preflight works and unauthenticated calls are rejected. Its server-side `ANTHROPIC_API_KEY` still needs to be configured; a successful live Claude response has not been verified. Local fallback feedback is explicitly labeled as offline.
- **Build checks:** web export and `npm run typecheck` pass. The complete type check runs TypeScript for the frontend and Deno for the Edge Function; generated bundles are excluded from source checking.
- **Deployment:** the web frontend is hosted on Vercel. This does not establish that the backend or the full application is operational.

The sample demonstrates the interface and intended report format. It is not evidence of live AI output, current active users, or validated improvements in golf performance.

## What is implemented in the source

- Scorecard entry with strokes, putts, and trouble tags.
- Round history and scoring statistics.
- Diagnosis workflows that invoke a Supabase Edge Function as a server-side Claude API proxy.
- Charts for score trends, trouble distribution, par-type performance, and putting. The public demo uses sample values.
- Practice check-ins, social feeds, golf crews, and buddy/outings screens.
- A coach-interest waitlist flow; a working coach marketplace is not provided.

These are implementation descriptions, not claims that every hosted workflow currently works. The complete authenticated save/read/AI workflow and Storage policies still require verification. The public sample is separate from that verification.

## Technology and architecture

| Layer | Implementation |
| --- | --- |
| Frontend | React 18, React Native 0.74, Expo SDK 51, React Native Web, TypeScript |
| Navigation | React Navigation |
| Backend integration | Supabase Auth, PostgreSQL, Storage, and Edge Functions |
| AI integration | Claude Sonnet 4.6 through the server-side `analyze-round` function; live result pending verification |
| Web hosting | Expo web export on Vercel |

The frontend uses **Expo / React Native Web**, rather than Next.js or Vite. See [package.json](package.json), [Supabase client](src/lib/supabase.ts), [AI client](src/lib/claude.ts), and [Edge Function](supabase/functions/analyze-round/index.ts).

```text
Expo / React Native Web
        │
        ├── Supabase Auth / PostgreSQL / Storage
        └── Supabase Edge Function ── Anthropic Claude API

Public /demo: fixed sample charts + prewritten report
```

## Product decisions

The scorecard design captures trouble tags alongside strokes and putts so that diagnosis can use more context than round totals alone. The report format separates observations, evidence, possible causes, and a practice plan; causal explanations remain hypotheses.

During earlier course-data cleanup, 272 unverified courses were removed and 262 were retained. This is a historical development milestone, not a fresh verification of the currently hosted database. See [ROADMAP.md](ROADMAP.md) for the archived validation plan and current prerequisite.

## Running locally

```bash
git clone https://github.com/RRYanng/everyone72.git
cd everyone72
npm ci
cp .env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run web
```

Use your own reachable Supabase project. Even the frontend sample currently requires the two public configuration values at startup because the application initializes its Supabase client globally. Supplying configuration alone does not provision a database or make the authenticated workflows work.

For account and AI functionality, the SQL files under [`supabase/`](supabase/) describe the schema and later changes. They are not a tested one-command provisioning process. Review the schema changes, configure Auth and Storage, and deploy the Edge Function to your own project. Store `ANTHROPIC_API_KEY` as a **server-side Edge Function secret**; never put it in `EXPO_PUBLIC_*` variables or the client bundle.

```bash
# Check all TypeScript source with the appropriate runtime
npm run typecheck

# Export the web frontend
npm run build:web
```

The Deno checker is installed as a development dependency. `deno.edge.json` and `deno.edge.lock` configure the local backend check; they do not change the deployed Edge Function or its authentication configuration.

Do not commit `.env`, service-role keys, or AI API credentials. Current hosted backend credentials and project administration are not included in this repository.

## About the builder

Ruiyi (Alan) Yang — UC Irvine Cognitive Science, seeking FDE / Applied AI opportunities.

[Portfolio](https://ruiyiyang.vercel.app/) · [GitHub](https://github.com/RRYanng) · [LinkedIn](https://linkedin.com/in/ruiyiyang) · ruiyiyanng@gmail.com
