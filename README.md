# 🎓 Higher Education Tracker

Track your whole MS / PhD journey in one place — from **applying** (professors, universities, scholarships, emails, documents) to **doing the degree** (milestones, courses & GPA, publications, supervisor meetings, funding).

- Sign up with email + password; your data **syncs across all your devices**
- Works **offline** — changes are saved on the device and upload when you're back online
- Or use it **without an account** (data stays in your browser only)
- 100 % static site — hosted free on GitHub Pages, backend is a free Supabase project

---

## ✨ What's in it

| Section | What you can do |
|---|---|
| 🏠 Dashboard | Next deadlines (universities, scholarships, **degree milestones**), overdue items, follow-ups, degree alerts |
| 🔬 Professor Outreach | Every professor you contacted, response, funding, status, CSV export |
| 🏛️ University Board | Applications, deadlines, requirements, countdowns |
| 🏆 Scholarships | Eligibility cross-check against your profile |
| 📧 Email Log | Sent / reply / follow-up tracking |
| 📁 Document Archive | Upload PDFs, images, Word files (private cloud storage when signed in) |
| 🎓 **My Degree** | Milestones (typical MS / PhD list to edit), courses & credit-weighted GPA, publications, supervisor/committee meetings with action items, funding end-dates |
| ✅ Checklist & Goals | Tasks, goals, document tracker |

> **Milestone templates are only a starting point.** Programs differ (qualifying exam in year 2 vs 3, annual reviews, etc.). Set every date from *your* program handbook.

---

## 🚀 Set up cloud sync (one time, ~10 minutes, free)

Without this step the app still works — in local-only mode.

### 1. Create a Supabase project
1. Go to <https://supabase.com> → **New project** (free plan).
2. Wait for it to finish provisioning.

### 2. Create the database
1. Open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   It is safe to run more than once.
3. (Optional check) run this — it must return **zero rows**:
   ```sql
   select schemaname, tablename from pg_tables where schemaname = 'public' and not rowsecurity;
   ```

### 3. Connect the app
1. In Supabase: **Settings → API Keys**. Copy the **Project URL** and the **publishable key** (`sb_publishable_…`; on older projects the `anon` key works too).
2. Put them in [`js/config.js`](js/config.js):
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxx',
   ```
   These two values are **meant to be public** — security comes from the row-level-security rules in `schema.sql`, which let each user read and write only their own rows and files.
3. ⚠️ **Never** put the `secret` / `service_role` key in this project. It bypasses all security.

### 4. Allow your site's address for sign-in emails
In Supabase: **Authentication → URL Configuration**
- **Site URL**: your GitHub Pages address, e.g. `https://<user>.github.io/<repo>/`
- **Redirect URLs**: add the same address (and `http://localhost:8000/` if you test locally)

Without this, the confirmation / password-reset links in emails will point to the wrong place.

> Supabase's built-in email sender is heavily rate-limited and meant for testing. If more than a few people will sign up, add your own SMTP under **Authentication → SMTP**.

### 5. Deploy
Push to GitHub and enable **Settings → Pages** (branch `main`, folder containing `index.html`).

### Test locally
```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

---

## 🔒 How your data is protected

- Every record and file belongs to a user id. **Row-level security** is enabled and enforced in the database, not in the browser.
- Files live in a **private** bucket, in a folder named after your user id. Downloads use short-lived (60 s) signed links.
- All text you enter is HTML-escaped before display, and links must be `http(s)`.
- Signing out removes your cached data from the device.
- **Delete My Account** (Data Management menu) erases your account, records and files.

## ☁️ How sync behaves

- Each item (a professor, a milestone, a course…) syncs on its own. Editing *different* items on two devices never conflicts.
- If two devices edit the *same* item, the **last one saved wins**.
- Edits made offline are queued (the sidebar chip shows *Offline · n pending*) and upload automatically when you're back online.
- ⚠️ Closing the tab while offline keeps the queue, but **clearing browser data deletes it**. Wait for "All changes saved" before clearing site data or signing out.

## ⚠️ Free-tier limits to know about

| Limit | What it means |
|---|---|
| **Project pauses after 1 week of no activity** | Your data is kept; open the Supabase dashboard and click *Restore*. Until then the app runs from the saved copy on your device. Use the app weekly, or take regular backups. |
| 1 GB file storage, **50 MB per file** | Enough for hundreds of PDFs. The app checks both limits before uploading. |
| 500 MB database | Far more than text records will ever need. |

## 💾 Backups

**Data Management → Export Backup (JSON)** saves all records. **Uploaded files are not inside the JSON** — download them from *Document Archive*. Take a backup before deleting an account or at the end of each term.

---

## 🧑‍💻 Developer notes

```
index.html
css/style.css
supabase/schema.sql    ← database, RLS policies, private storage bucket (run once)
js/config.js           ← Supabase URL + publishable key
js/storage.js          ← synchronous local cache API + per-record change tracking
js/sync.js             ← outbox, push, pull, per-record last-write-wins merge
js/auth.js             ← sign-in / sign-up / reset / guest / migration / delete account
js/files.js            ← documents: Supabase Storage (signed in) or IndexedDB (guest)
js/db.js               ← IndexedDB wrapper used for guest files
js/degree.js           ← My Degree tab
js/{dashboard,professors,universities,scholarships,emails,archive,checklist}.js
js/app.js              ← routing, escaping/date helpers, onboarding, init
```

- No build step. `supabase-js` is loaded from a CDN, **pinned to an exact version with a Subresource Integrity hash**. To upgrade: download the new `dist/umd/supabase.js`, recompute `sha384`, update the `<script>` tag in `index.html`.
- Feature modules call `Storage.getX()/setX()` synchronously; `Storage.set()` diffs per record and queues changes for `Sync`. New data types need an entry in `Storage.KEYS` and `Storage.SYNCED`.
- Always wrap user text in `esc()` and URLs in `safeUrl()` inside templates. Dates are `YYYY-MM-DD` strings — use `parseDate / daysUntil / fmtDate`, never `new Date('YYYY-MM-DD')` (UTC off-by-one).

*Made for dedicated students. Good luck with your applications and your degree!* 
