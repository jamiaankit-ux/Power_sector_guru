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

1. Add payment keys (`PAYMENT_PROVIDER=razorpay` plus keys) and an SMS provider for OTP.
2. Host videos on Bunny Stream, Cloudflare Stream, Vimeo or S3 + CloudFront and paste links into lessons.
3. Add your GSTIN and address to the invoice template (`src/app/invoice/[id]/page.tsx`) and your terms/privacy pages.
4. Use paid hosting/database plans so the site never sleeps and data is backed up.

## Apps for every device

- **Installable app (no store needed):** the site is a Progressive Web App. Android/Windows/Mac (Chrome or Edge): "Install app". iPhone/iPad: Safari → Share → Add to Home Screen. Instructions for learners are at `/install`.
- **Play Store and App Store:** Capacitor wraps the deployed site in native shells.
  ```bash
  npm i @capacitor/android @capacitor/ios
  APP_URL=https://your-domain npx cap add android && npx cap add ios
  npx cap open android   # build in Android Studio
  npx cap open ios       # build in Xcode (needs a Mac and Apple developer account)
  ```

## Tech

Next.js 15 (App Router, server actions), React 19, Tailwind CSS 4, Prisma, JWT cookie sessions, pdf-lib + QR certificates, Capacitor for native apps.
