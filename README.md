# CanWin Referral Platform

A modern referral management platform built with React, Vite, and Supabase.

## Features

- **User Registration**: WhatsApp-based authentication with Aadhar verification
- **Referral System**: Earn points for referring students to courses
- **Points System**: 10 points for paid courses, 2 points for free courses
- **Level Progression**: 5 levels (Initiator → Advocate → Guardian → Mentor → Luminary)
- **Admin Dashboard**: Complete user and referral management
- **Course Management**: Create and manage paid/free courses
- **Analytics**: Monthly performance tracking and insights
- **ID Card Generation**: Downloadable PDF ID cards

## Tech Stack

- **Frontend**: React 19, React Router 7
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ameennm/canwin.git
cd canwin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Set up Supabase database:
   - Go to Supabase Dashboard → SQL Editor
   - Run the contents of `supabase-schema.sql`

6. Create storage bucket (for avatars):
   - Go to Storage → New Bucket
   - Name: `avatars`
   - Enable "Public bucket"

7. Create admin user:
   - Go to Authentication → Users
   - Add user: `admin@canwin.com` / `Admin@123`

8. Start development server:
```bash
npm run dev
```

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `CRON_SECRET` (optional, for cron security)

4. Deploy

The cron job runs every 5 days to keep Supabase free tier active.

## Project Structure

```
canwin/
├── api/
│   └── keep-alive.js      # Vercel cron endpoint
├── public/
│   └── vite.svg           # Favicon
├── src/
│   ├── components/        # Reusable components
│   │   ├── BirthdayCard.jsx
│   │   ├── IDCard.jsx
│   │   ├── LevelBadge.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── ReferralForm.jsx
│   │   ├── Spinner.jsx
│   │   └── Toast.jsx
│   ├── lib/
│   │   └── supabase.js    # Supabase client & helpers
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminLogin.jsx
│   │   ├── LandingPage.jsx
│   │   ├── PendingPage.jsx
│   │   ├── RegistrationPage.jsx
│   │   └── UserDashboard.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── supabase-schema.sql
├── vercel.json
└── vite.config.js
```

## Security Features

- Environment variables for sensitive data
- Row Level Security (RLS) in Supabase
- Input validation and sanitization
- Secure session management
- Admin-only routes protected
- XSS prevention

## Level System

| Level | Points Required |
|-------|-----------------|
| Initiator | 0 - 99 |
| Advocate | 100 - 199 |
| Guardian | 200 - 299 |
| Mentor | 300 - 399 |
| Luminary | 400+ |

## API Routes

- `/` - Landing page (login)
- `/register` - User registration
- `/pending` - Pending approval status
- `/dashboard` - User dashboard
- `/adminlogin` - Admin login (secret URL)
- `/admin/dashboard` - Admin dashboard

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Author

**Ameen NM**
- GitHub: [@ameennm](https://github.com/ameennm)
- Email: muhammedmusthafaameennm@gmail.com
