# Action & Priority Intelligence Agent (open source, free to run)

Sorts your tasks into the Eisenhower Matrix using Claude, then lets you push
"Schedule" tasks straight to Google Calendar.

## Why this costs you $0 as the owner

- **BYOK (bring your own key):** every visitor pastes their own free Google
  AI (Gemini) API key. It's stored only in their browser (`localStorage`),
  sent straight from their browser to Google. Your server never sees it,
  never pays for it. Gemini's free tier needs no credit card — 1,500
  requests/day on Gemini Flash.
- **Hosting:** Vercel free tier.
- **Auth:** Google OAuth, "Testing" mode (free, no review needed, capped at
  100 users — enough to launch and prove it out).

## Stack

- Next.js (React + API routes in one app)
- NextAuth.js — handles Google OAuth/login for you
- Google Calendar API — via the user's own Google login token
- Google Gemini API — called directly from the browser with the user's own key

## Getting a free Gemini API key (for testing, and for anyone using the site)

1. Go to **aistudio.google.com** and sign in with any Google account.
2. Click "Get API key" → "Create API key" — no billing, no credit card.
3. Copy the key and paste it into the app's key field at the top.

Note: this app calls `gemini-3.6-flash`. Google retires model versions over
time — if requests start failing with a "model no longer available" error,
open `pages/api/gemini/triage.js`, find `gemini-3.6-flash`, and swap in
whatever Google's current stable Flash model is at aistudio.google.com.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Google OAuth
   credentials (free, from console.cloud.google.com — create a project,
   enable Calendar API, create OAuth client ID, add
   `http://localhost:3000/api/auth/callback/google` as a redirect URI).
3. `npm run dev`

## Deploy for free

1. Push this repo to GitHub (public repo = your "open source" part).
2. Import it into Vercel (vercel.com), connect the GitHub repo.
3. Add the same `.env` values in Vercel's project settings.
4. Add your Vercel URL's callback (`https://yourapp.vercel.app/api/auth/callback/google`)
   to the Google OAuth client's redirect URIs.
5. Ship it. First 100 Google logins work immediately in Testing mode.

## License

MIT — see LICENSE. Anyone can use, copy, modify, and redeploy this for free.
