# CanWin Referral Platform

A referral and commission platform for course admissions. Promoters register students for courses; when an admin approves an admission, commissions are paid to the promoter and up to four uplines above them.

## Features

- **Promoter hierarchy**: ranks Super Admin → Platinum → SDO → SOP → SO → JSO, each promoter has a referral code and a stored upline chain
- **Admissions**: promoters submit students; admins approve or reject them
- **5-level commissions**: per-course fixed payouts for levels 1–5, credited on approval
- **Bonus campaigns**: time-boxed extra payout for the direct referrer
- **Points and auto rank-up**: points per admission, automatic promotion at point thresholds
- **Wallet**: earnings, withdrawable and pending balances, a commission ledger, withdrawal requests (₹500 minimum)
- **Admin dashboard**: promoters, admissions, courses, withdrawals, bonuses, offers and stats
- **ID card**: downloadable PDF

## Tech stack

- **Frontend**: React 19, React Router 7, Vite 7, Tailwind CSS 4
- **Backend**: Cloudflare Pages Functions (`functions/api/**`)
- **Database**: Cloudflare D1 (`canwin_v2_final_db`, bound as `DB` in `wrangler.toml`)
- **Auth**: JWT signed with the `JWT_SECRET` secret
- **Hosting**: Cloudflare Pages project `canwin`

## Getting started

Prerequisites: Node.js 18+, a Cloudflare account with access to the `canwin` Pages project and the `canwin_v2_final_db` database.

```bash
npm install
npx wrangler login
cp .dev.vars.example .dev.vars     # then set JWT_SECRET
npm run db:migrate:local           # create the local D1 database
npm run build
npm run dev:backend                # serves dist/ and functions/ on http://localhost:8788
```

`npm run dev` runs the Vite dev server for frontend-only work; API calls need `dev:backend`.

## Database

Schema lives in `migrations/` and is applied with Wrangler:

```bash
npm run db:migrate:local    # local copy under .wrangler/ (git-ignored)
npm run db:migrate:remote   # production D1
```

## Deployment

The Pages project builds from the `main` branch of this repository. To deploy by hand:

```bash
npm run deploy
```

The production environment needs the `JWT_SECRET` secret:

```bash
npx wrangler pages secret put JWT_SECRET --project-name canwin
```

The API refuses to issue or accept tokens when `JWT_SECRET` is missing.

## Project structure

```
canwin/
├── functions/api/        # Pages Functions (REST API)
│   ├── _middleware.js    # JWT auth for every /api route except login/register
│   ├── admin/            # admin-only endpoints
│   ├── auth/             # login, register
│   └── *.js              # courses, admissions, wallet, team, bonuses
├── migrations/           # D1 schema migrations
├── public/               # static files, _headers
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/api.js        # fetch wrapper for /api
│   └── pages/
├── wrangler.toml         # Pages + D1 binding
└── vite.config.js
```

## Routes

- `/` login, `/register` sign-up, `/pending` awaiting approval
- `/dashboard`, `/add-student`, `/my-admissions`, `/my-team`, `/withdraw`
- `/adminlogin`, `/admin/dashboard`

## Author

**Ameen NM** · [@ameennm](https://github.com/ameennm)
