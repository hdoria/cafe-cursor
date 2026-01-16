# Cafe Cursor

A Next.js 14 application for distributing Cursor IDE credits to eligible users from events.

## Overview

This is a credit distribution system where pre-approved event attendees can claim Cursor IDE referral credits. It features:
- User registration with email verification against eligible users list
- Admin panel for managing credits and users
- Multilingual support (Portuguese/English)
- Email notifications via Resend

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Language**: TypeScript

## Project Structure

```
app/
  ├── admin/      # Admin panel pages
  ├── api/        # API routes
  ├── layout.tsx  # Root layout
  ├── page.tsx    # Main registration page
  └── globals.css
components/       # React components
lib/              # Utility functions and Prisma client
prisma/
  ├── schema.prisma  # Database schema
  └── seed.ts        # Database seeder
```

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password
- `RESEND_API_KEY` - Resend API key for emails (optional)
- `FROM_EMAIL` - Sender email address

## Development

The dev server runs on port 5000:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Database Commands

```bash
npm run db:push   # Push schema changes
npm run db:seed   # Seed the database
npm run db:studio # Open Prisma Studio
npm run db:reset  # Reset and reseed database
```

## Deployment

For production, use:
```bash
npm run build
npm start
```
