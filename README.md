# Aqall - AI-Powered Arabic-First Website Builder

Build beautiful websites with AI. Describe your vision in Arabic or English, and watch it come to life. No coding required.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm (or bun)
- A Supabase project (for authentication and database)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript
- **UI**: React 18 + Tailwind CSS + shadcn/ui
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom design tokens

## 📁 Project Structure

```
app/                    # Next.js App Router pages
  (auth)/              # Auth route group (no navbar)
    auth/              # Authentication pages
  build/               # Build chat pages
  dashboard/           # Dashboard
  preview/             # Preview pages
src/
  components/          # React components
  contexts/           # React contexts (Auth, Language)
  lib/                # Utilities and services
  hooks/              # Custom React hooks
supabase/              # Database schema
docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

1. Go to your Supabase Dashboard
2. Run the SQL from `supabase/setup-profiles.sql` in the SQL Editor
3. This creates the `profiles` table with RLS policies

See `docs/SUPABASE_SETUP.md` for detailed instructions.

## 📚 Documentation

- `docs/ROADMAP_AQALL_MVP.md` - Development roadmap
- `docs/SUPABASE_SETUP.md` - Supabase setup guide
- `docs/SUPABASE_EMAIL_SETUP.md` - Email confirmation setup

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## 🌐 Features

- ✅ Bilingual support (Arabic/English) with RTL/LTR
- ✅ Supabase Authentication with email confirmation
- ✅ User profile management
- ✅ AI-powered website generation (mock for now)
- ✅ Project management
- ✅ Live preview
- ✅ Responsive design

## 📝 License

Private - All rights reserved
