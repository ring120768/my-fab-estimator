# Deployment guide — Railway + Supabase + (optional) Hostinger domain

This walks you from "running on localhost" to "your team can log in from any
browser." About 30–45 minutes the first time.

---

## Step 1 — Push to GitHub

If you don't have git initialised yet, do this once in the project folder:

```bash
cd "/Users/ianring/Documents/Claude/Projects/My Fab Estimator"
git init
git add .
git commit -m "Initial commit — pricing engine + Supabase-backed app"
```

Then create an empty repo on GitHub:

1. Go to https://github.com/new
2. Name: `my-fab-estimator` (private if you want)
3. **Don't** initialise with README/license — we already have files
4. Copy the two-line "push existing repo" commands GitHub gives you and run them

After this, your code is on GitHub.

---

## Step 2 — Deploy to Railway

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Pick your `my-fab-estimator` repo. Railway auto-detects Next.js.
3. Wait for the first deploy. It will fail because env vars aren't set — that's expected.
4. Open the project → **Variables** tab → **+ New Variable** → add these two:

```
NEXT_PUBLIC_SUPABASE_URL=https://wgfuravcoxmurljicpep.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9ZYN4gf1bZ3ubZKfpdYkaQ_M9WmH_62
```

5. Railway will redeploy automatically. After ~2 minutes you'll see a green
   tick. Click **Settings → Networking → Generate Domain** to get a public URL
   like `my-fab-estimator-production.up.railway.app`.

Open that URL — you should see the login page.

---

## Step 3 — Tell Supabase about the new URL

Auth redirects need to know about your production domain.

1. Supabase Dashboard → your project → **Authentication → URL Configuration**
2. Set **Site URL** to your Railway URL (e.g. `https://my-fab-estimator-production.up.railway.app`)
3. Under **Redirect URLs**, add the same URL (and `http://localhost:3001` so dev still works)

Now when someone clicks an email confirmation link, it sends them to the right
place.

---

## Step 4 — (Optional) Custom domain via Hostinger

1. Buy a domain on Hostinger (e.g. `myfabestimator.com`).
2. Railway → **Settings → Networking → Custom Domain** → add your domain.
   Railway gives you a CNAME target.
3. Hostinger → DNS settings for your domain → add a CNAME record:
   - Type: `CNAME`
   - Name: `@` (or `www`, depending on whether you want apex or subdomain)
   - Target: the value Railway gave you
   - TTL: leave default
4. Wait 5–30 minutes for DNS to propagate.
5. Update Supabase **Site URL** and **Redirect URLs** again to use the new
   custom domain.

---

## After deploy — sharing with your team

Send them the URL, ask them to register, and that's it. Each user creates
their own account; the first user creates the company; subsequent users will
hit a "no company" state — to handle that, we'll add a "join company" flow
later. For now if multiple people from the same fabricator want to test,
either share a single login or I can add the invite flow next session.

---

## Troubleshooting

- **Build fails on Railway**: check logs — usually missing env var or a typo.
- **App loads but signin fails**: check Supabase Site URL matches Railway URL.
- **"new row violates RLS"**: probably a missed migration. Check both
  `0001_initial_schema.sql` and `0002_create_company_with_owner.sql` ran.
- **Confirmation email never arrives**: in Supabase → Authentication →
  Providers → Email → either disable "Confirm email" for testing, or check spam.
