# Action & Priority Intelligence Agent

Your AI-powered productivity co-pilot. Talk or type your tasks, and it sorts
them into the Eisenhower Matrix — Do It Now, Schedule, Delegate, Delete —
then lets you push them straight to your Google Calendar or hand them off
to someone else, all in one place.

Free to run for anyone — see "How it stays free" below.

---

## Getting started (first time)

**1. Sign in with Google**
Tap **Sign in** in the "Connect your tools" panel at the top. Google will
show a screen saying *"Google hasn't verified this app"* — that's expected
for a small independent tool like this one, not a sign of danger. Tap
**Advanced**, then **"Go to Action & Priority Agent (unsafe)"** to continue.
This connects your Calendar and Gmail so the app can act on your behalf.

**2. Add your free AI key**
Under "Google Gemini (free)," tap **Get Key** — this opens Google's AI
Studio in a new tab. Sign in with any Google account, click **"Create API
key,"** and copy it (no credit card, no cost, ever, within the free daily
limit). Paste it into the key field back in the app, and tap **Save**.

That's it — setup is done, and it's remembered on this device from now on.

---

## How it works

**🎤 Dictate or type**
Tap the mic and talk naturally — even one long sentence mixing several
different tasks works fine ("email Sam about the invoice, also I need to
pick up the kit at 2, and someone should review the landing page"). Or just
type in the box. Then tap **Smart Routing** to sort everything.

**The four boxes:**

- 🔴 **Do It Now** — important and urgent. Needs your attention today.
- 🟢 **Schedule** — important, but not urgent. Each card gets a date/time
  picker — set it and tap **Calendar** to add it straight to your Google
  Calendar, at exactly that time.
- 🟠 **Delegate** — someone else should handle this. Type their email or
  phone number, then tap **Send** (emails them for real, through your own
  Gmail) or **WhatsApp** (opens a pre-filled message, one tap to send). If
  they also sign into this same app, the task shows up on their side too,
  and they can reply straight back to you.
- 🟣 **Delete** — low-value, doesn't need doing. Just here as a reminder to
  let it go.

**Moving a task between boxes**
Either drag a card with your mouse or finger, or use the small **"Move
to:"** icons at the bottom of every card — one tap moves it instantly,
no dragging required.

**Marking something done**
Tap the checkbox on any card. If it had been pushed to your calendar, the
event is automatically removed too.

**Keyboard shortcuts (laptop only)**
- Tap **Control** alone to start/stop dictating.
- Tap **Option** (Mac) / **Alt** (Windows) alone to run Smart Routing.

---

## How it stays free

- **You bring your own AI key** — Gemini's free tier, or your own paid
  Claude/OpenAI key if you prefer. Either way, nothing routes through the
  app owner's account or billing.
- **Hosting** runs on Vercel's free tier.
- **Calendar and Gmail** actions use your own Google login — free, with
  generous daily limits.

---

## For developers / self-hosting

### Stack
- Next.js (React + API routes in one app)
- NextAuth.js for Google sign-in
- Google Calendar & Gmail APIs, via the signed-in user's own token
- Gemini / Claude / OpenAI APIs, via a bring-your-own-key model
- Supabase (free tier) for saved tasks, delegation, and usage stats

### Local setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own Google OAuth
   credentials (console.cloud.google.com → enable Calendar API and Gmail
   API → Credentials → create an OAuth client ID → add
   `http://localhost:3000/api/auth/callback/google` as a redirect URI).
3. `npm run dev`

### Database setup (Supabase, free tier)
Run once in the Supabase SQL editor:

```sql
create table if not exists users (
  email text primary key,
  name text,
  first_seen timestamptz default now(),
  last_seen timestamptz default now()
);

create table if not exists user_tasks (
  user_email text primary key,
  tasks jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists feedback (
  id bigint generated always as identity primary key,
  user_email text,
  rating text,
  created_at timestamptz default now()
);

create table if not exists assignments (
  id bigint generated always as identity primary key,
  from_email text not null,
  to_email text not null,
  task_text text not null,
  reason text,
  status text default 'pending',
  reply text,
  created_at timestamptz default now()
);
```

### Deploying
1. Push to a GitHub repo (public or private — both work fine on the free
   tiers used here).
2. Import into Vercel, add all the same environment variables from
   `.env.local`, except `NEXTAUTH_URL` becomes your live Vercel address.
3. Add that live address to Google Cloud's OAuth client (both Authorized
   JavaScript origins and Authorized redirect URIs).
4. Google Auth Platform → Audience → switch Publishing status from Testing
   to In production once you want anyone (not just accounts you've
   manually added) to be able to sign in.

### Admin stats
Visit `/admin` on your deployed site, enter the `ADMIN_SECRET` you set in
your environment variables, to see registered users, active users, and
satisfaction (👍/👎) counts.

## License

MIT — see LICENSE. Anyone can use, copy, modify, and redeploy this for free.
