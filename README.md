# Power Sector Academy — Making you ready for AI-enabled Power Sector

A complete learning management system (LMS) for power sector courses. One codebase runs as a **website** and installs as an **app on Android, iPhone, Windows and Mac**, with native **Play Store / App Store** builds available through Capacitor.

## Features

**For learners**
- Registration with email and/or mobile number; sign in with **password or one-time code (OTP)** by email or phone
- Course catalogue with search and filters (topic, level, free/paid), course pages with curriculum, outcomes, reviews and free preview lessons
- **Video lectures** (MP4/HLS link or YouTube) with resume-where-you-left-off, playback speed and **timestamped notes**
- **Study material** lessons (rich notes with tables and key takeaways) plus downloadable PDFs/slides
- **Quizzes**: timed, multiple choice, instant results with explanations, retakes and attempt limits
- **Performance dashboard**: total watch hours, daily learning chart (30 days), streaks, course progress, quiz history, per-course performance
- **Certificates** issued automatically on completion (all lessons done + pass mark reached): designed certificate page, **PDF with QR code**, public **verification** page, "Add to LinkedIn"
- Lesson-level **doubt discussion** (Q&A) with instructor replies
- **Leaderboard** (weekly / monthly / all time), announcements, dark mode, mobile bottom navigation, offline support for recently opened pages

**For you (admin panel at `/admin`)**
- Analytics: revenue, learners, weekly active learners, enrollments, watch hours, discount totals, 30-day revenue chart, completion rate per course
- Course builder: courses, modules and lessons (video / study material / quiz), reordering, quiz question editor, pass marks, time limits, preview lessons, access period, pricing and list price
- **Pricing**: single-course prices, **bundles** (any set of courses at one price) and **subscription plans** (monthly / quarterly / yearly, unlock all courses)
- **Discount codes**: percentage or flat, cap, minimum order, total and per-learner limits, validity dates, restrict to a course / bundle / plan, pause anytime
- Orders with GST-inclusive invoices and **CSV export**; learners list with search, roles (student / instructor / admin) and manual course access grants; doubt inbox; announcements

## Make it live (about 10 minutes, free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jamiaankit-ux/Power_sector_guru)

1. Click the button above and sign in to Render with GitHub (allow access to this repository).
2. Render reads `render.yaml` and creates the website plus a Postgres database. When asked, fill in:
   - `ADMIN_EMAIL`, `ADMIN_PHONE` (10 digits) and `ADMIN_PASSWORD`: your admin login
   - `APP_URL`: leave blank for now
3. Click **Apply**. The first build takes 5 to 10 minutes and loads the 6 courses, plans, bundles and discount codes.
4. Open the `https://power-academy-xxxx.onrender.com` link Render shows, sign in with your admin details, and go to `/admin`.
5. Copy that link into the `APP_URL` setting (Render → power-academy → Environment) so certificate QR codes point to it.

While payment keys are not added, paid courses show "Payments opening soon" and free courses work fully. One-time-code login stays hidden until an SMS or email provider is added; password login works.

Notes on the free plan: the site sleeps after 15 minutes without visitors (first visit then takes about a minute), and Render's free database expires after 30 days. Before real launch, move to Render's Starter plans (about $7/month each) or point `DATABASE_URL` at a free Neon database. A custom domain (e.g. `learn.yourbrand.in`) can be added under Settings → Custom Domains.

## Run it on your computer

```bash
npm install
cp .env.example .env      # set DATABASE_URL to a PostgreSQL database
npm run setup             # creates tables and loads demo content (never wipes existing content)
npm run dev               # http://localhost:3000
```

`npm run db:reset` wipes the database and reloads demo content.

Demo logins in development (when `ADMIN_PASSWORD` is not set and `SEED_DEMO_LEARNER` is not `false`):

| Role | Login | Password |
|---|---|---|
| Admin | admin@poweracademy.in or 9999999999 | admin123 |
| Learner | learner@poweracademy.in or 9888888888 | learner123 |

The demo includes 6 power sector courses (Power System Fundamentals, Grid Operations & DSM, Renewable Integration & Storage, Electricity Markets & Trading, Substation & Transmission, Regulation & Tariff), 2 bundles, 2 subscription plans and 3 discount codes (`LAUNCH50`, `GRID1000`, `STUDENT20`). **Video links are public sample clips. Replace them with your own lectures in Admin → Courses.**

## Plugging in payments, SMS and email

Everything is configured in `.env`:

| Setting | What it does |
|---|---|
| `PAYMENT_PROVIDER` | `mock` (no gateway yet), `razorpay` (UPI, cards, net banking — recommended for India) or `stripe` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | From the Razorpay dashboard |
| `STRIPE_SECRET_KEY` | From the Stripe dashboard |
| `ALLOW_TEST_PAYMENTS` | `true` shows a test payment screen that unlocks paid courses without money. Keep `false` on a live site |
| `TAX_PERCENT` | GST shown on invoices; prices are GST-inclusive |
| `SMS_PROVIDER` | `console` (codes printed in the server log), `msg91` (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) or `twilio` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`) |
| `EMAIL_PROVIDER` | `console` or `resend` (`RESEND_API_KEY`, `EMAIL_FROM`) |
| `AUTH_SECRET` | A long random string (e.g. `openssl rand -hex 32`) |
| `APP_URL` | Your public URL, used in certificate QR codes and payment redirects |

Payment code lives in `src/lib/payments/index.ts`; adding another gateway (PayU, Cashfree, PhonePe) means adding one branch there.

## Before the real launch

1. **Your own domain and SSL.** Buy a domain (e.g. `powersectoracademy.in`) from GoDaddy, Namecheap or Cloudflare. In Render → your web service → Settings → Custom Domains, add `powersectoracademy.in` and `www.powersectoracademy.in`, then create the DNS records Render shows (CNAME for `www`, A/ALIAS for the root). Render issues and renews the SSL certificate automatically. Then set `APP_URL=https://powersectoracademy.in` and redeploy. Security headers (HSTS, clickjacking and sniffing protection) are already on.
2. **Paid plans.** Move the web service to Starter and the database to a paid plan (the free database is deleted after 30 days and the free server sleeps).
3. **Payments and OTP.** `PAYMENT_PROVIDER=razorpay` plus keys; `SMS_PROVIDER=msg91` (DLT-registered template) and/or `EMAIL_PROVIDER=resend`.
4. **Business details and policies.** Admin → Settings: GSTIN, address, support email/phone/WhatsApp, terms, privacy and refund policy (Razorpay and the app stores require these pages).

## Where things are stored

| What | Where | Notes |
|---|---|---|
| Learners, progress, orders, certificates | PostgreSQL (Render) | Paid plan includes daily backups |
| PDFs, slides, cover images | Cloudflare R2 bucket if `S3_*` is set, otherwise the database (max 15 MB each) | R2: 10 GB free, no download fees |
| Videos | Your video host (Bunny Stream recommended) | Paste the HLS (`.m3u8`) or MP4 link into the lesson |

**Cloudflare R2 setup:** create a bucket, enable public access (or connect `files.yourdomain`), create an API token, then set `S3_BUCKET`, `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL=https://files.yourdomain`. Any S3-compatible store works (AWS S3, DigitalOcean Spaces).

**Video hosting:** Bunny Stream (about $5 per TB, India edge, HLS, token security, DRM option) is the best value. Cloudflare Stream and Vimeo also work. The player streams HLS on every device and shows a moving watermark with the learner's email to discourage screen recording. Unlisted YouTube links also work.

## Optional add-ons

- **AI study assistant:** set `ANTHROPIC_API_KEY` (from console.anthropic.com). Every lesson then gets an "Ask the AI study assistant" panel grounded in the lesson text. Uses Claude (`TUTOR_MODEL`, default `claude-opus-5-5`) with server-side fallback enabled, so if the model declines a request the API retries on its default fallback model. Daily limit per learner: `TUTOR_DAILY_LIMIT` (default 30). Admin → AI assistant shows what learners ask.
- **Push notifications:** create a Firebase project, add the Android app (`in.powersectoracademy.app`) and download `google-services.json` into `android/app/`. For iPhone, add the iOS app in Firebase, upload your APNs key, and add Firebase Messaging to the Xcode project (see the Capacitor push guide). Create a service account key (Project settings → Service accounts) and paste the JSON into `FIREBASE_SERVICE_ACCOUNT`. Send from Admin → Push notifications.

## Play Store and App Store apps

The website is also an installable app (PWA) on Android, Windows and Mac (“Install app” in Chrome/Edge) and iPhone (Safari → Share → Add to Home Screen); learner instructions are at `/install`.

The `android/` and `ios/` folders are native apps (Capacitor) that open your live site, so every website update reaches app users without a new store release. Inside the apps, prices, plans and checkout are hidden (Google Play and Apple require their own billing for in-app digital purchases); learners buy on the website and their courses appear in the app.

```bash
npm install
APP_URL=https://powersectoracademy.in npx cap sync   # after changing the domain
npm run app:assets                                   # regenerate icons/splash after changing the logo
npx cap open android   # Android Studio → Build → Generate Signed Bundle (.aab) → upload to Play Console
npx cap open ios       # Xcode on a Mac → Product → Archive → upload to App Store Connect
```

No Mac? Codemagic or Ionic Appflow can build and upload the iOS app from this repository in the cloud.

Store checklist: Google Play developer account ($25 once), Apple developer account ($99/year), privacy policy URL (`/privacy`), support URL, screenshots (phone and tablet), a demo learner login for the reviewers, and the data-safety / privacy questionnaire (we collect name, email, phone and learning activity; no data sold).

## Admin console

Overview with 7/30/90-day revenue, watch hours, sign-ups and quiz pass rate · courses with curriculum builder, duplicate, uploads and quiz CSV import with per-question analytics · plans, bundles and discount codes · orders and CSV exports · learner profiles (progress, quiz attempts, grant/revoke access, reset password) · certificates (search, revoke/restore) · doubts · AI assistant questions · announcements and push notifications · business settings and policies · activity log. Instructors (role INSTRUCTOR) see only the courses they own and the doubts.

## Tech

Next.js 15 (App Router, server actions), React 19, Tailwind CSS 4, Prisma on PostgreSQL, JWT cookie sessions, pdf-lib + QR certificates, Capacitor 7 for the Android and iOS apps, hls.js, Anthropic SDK for the AI assistant, S3-compatible storage, Firebase Cloud Messaging.
