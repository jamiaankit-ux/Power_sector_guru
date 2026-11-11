# Power Academy — Power sector learning platform

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

## Quick start

```bash
npm install
cp .env.example .env      # then edit values
npm run setup             # creates the database and loads demo content
npm run dev               # http://localhost:3000
```

Demo logins (created by the seed — change or delete before going live):

| Role | Login | Password |
|---|---|---|
| Admin | admin@poweracademy.in or 9999999999 | admin123 |
| Learner | learner@poweracademy.in or 9888888888 | learner123 |

The demo includes 6 power sector courses (Power System Fundamentals, Grid Operations & DSM, Renewable Integration & Storage, Electricity Markets & Trading, Substation & Transmission, Regulation & Tariff), 2 bundles, 2 subscription plans and 3 discount codes (`LAUNCH50`, `GRID1000`, `STUDENT20`). **Video links are public sample clips — replace them with your own lectures in Admin → Courses.**

## Plugging in payments, SMS and email

Everything is configured in `.env`:

| Setting | What it does |
|---|---|
| `PAYMENT_PROVIDER` | `mock` (test screen, default), `razorpay` (UPI, cards, net banking — recommended for India) or `stripe` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | From the Razorpay dashboard |
| `STRIPE_SECRET_KEY` | From the Stripe dashboard |
| `TAX_PERCENT` | GST shown on invoices; prices are GST-inclusive |
| `SMS_PROVIDER` | `console` (codes printed in the server log), `msg91` (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) or `twilio` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`) |
| `EMAIL_PROVIDER` | `console` or `resend` (`RESEND_API_KEY`, `EMAIL_FROM`) |
| `AUTH_SECRET` | A long random string (e.g. `openssl rand -hex 32`) |
| `APP_URL` | Your public URL, used in certificate QR codes and payment redirects |

Payment code lives in `src/lib/payments/index.ts`; adding another gateway (PayU, Cashfree, PhonePe) means adding one branch there.

## Going live

1. **Database:** switch `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma` and set `DATABASE_URL` to a Postgres database (Neon, Supabase, AWS RDS). Run `npx prisma db push`.
2. **Hosting:** deploy to Vercel, Render, Railway or any Node 20+ server (`npm run build && npm start`).
3. **Videos:** host on Bunny Stream, Cloudflare Stream, Vimeo or S3 + CloudFront and paste links into lessons.
4. Add your GSTIN and address to the invoice template (`src/app/invoice/[id]/page.tsx`) and your terms/privacy pages.

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
