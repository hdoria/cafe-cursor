# ☕ Cafe Cursor

> A modern, secure credit distribution system for Cursor IDE community events.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

- **🔐 Secure Registration** - Only pre-approved attendees with check-in can claim credits
- **✅ Check-in System** - Luma-style modal for event check-in verification
- **📧 Email Notifications** - Automatic email with credit details via Resend
- **🌍 Multi-language** - Portuguese (default), English, and Spanish support
- **📚 Documentation Section** - Public docs with Cursor IDE best practices and PDF attachments
- **📱 Responsive Design** - Beautiful dark theme, works on all devices
- **👤 Admin Panel** - Manage credits, users, documentation, and categories
- **📥 CSV Import** - Bulk import credits and Luma guests
- **🔄 Category Reordering** - Drag categories up/down in admin panel
- **⚡ Fast & Modern** - Built with Next.js 14 App Router

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/cafe-cursor.git
cd cafe-cursor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Resend API (get free key at resend.com)
RESEND_API_KEY="re_your_api_key"
FROM_EMAIL="Your Event <noreply@yourdomain.com>"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
```

### 4. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# Seed with sample data (optional)
npx tsx prisma/seed.ts
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

## 📊 Admin Panel

Access the admin panel at `/admin`:

- **Dashboard** - View credit statistics and user registrations
- **User Management** - Manage eligible users and check-in status
- **Credit Management** - Track available and used credits
- **Documentation** - Create and manage docs with categories, articles, and PDF attachments
- **CSV Import** - Bulk import credits and Luma guests

## 📦 Data Import

### Import Credits (CSV)

Create a CSV file with your Cursor referral links:

```csv
link
https://cursor.com/referral?code=ABC123
https://cursor.com/referral?code=DEF456
```

### Import Eligible Users from Luma (CSV)

Export guests from Luma and import directly:

```csv
email,name,company,approval_status,checked_in
john@email.com,John Doe,Acme Inc,approved,true
jane@email.com,Jane Smith,Tech Corp,approved,false
```

## 📚 Documentation System

The documentation system allows you to:

- Create categories to organize content
- Write articles in Markdown format
- Attach PDF files to articles (external URLs)
- Reorder categories with up/down arrows
- Publish/unpublish articles
- View public documentation at `/docs`

## 🌐 Multi-language Support

The application supports three languages:

- **Portuguese (PT-BR)** - Default language
- **English (EN)**
- **Spanish (ES)**

Users can switch languages using the dropdown selector with country flags in the header.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org) | React framework with App Router |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [Prisma](https://prisma.io) | Database ORM |
| [PostgreSQL](https://postgresql.org) | Database |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [Resend](https://resend.com) | Email delivery |

## 📁 Project Structure

```
cafe-cursor/
├── app/
│   ├── admin/           # Admin panel pages
│   │   └── dashboard/
│   │       ├── docs/    # Documentation management
│   │       ├── credits/ # Credits management
│   │       └── users/   # User management
│   ├── api/             # API routes
│   ├── docs/            # Public documentation page
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── components/          # React components
│   ├── LanguageSelector.tsx
│   ├── DocsButton.tsx
│   └── ...
├── lib/                 # Utilities and helpers
│   ├── prisma.ts        # Prisma client
│   ├── translations.ts  # i18n translations
│   └── auth.ts          # Authentication helpers
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
└── public/              # Static assets
```

## 🎨 Customization

### Change Event Name

Update the translations in `lib/translations.ts`:

```typescript
"pt-BR": {
  title: "Your Event Name",
  // ...
}
```

### Change Logo

Replace the SVG in `app/page.tsx` or add your logo to `public/`.

### Change Colors

Edit CSS variables in `app/globals.css`:

```css
:root {
  --foreground: #your-color;
  --background: #your-color;
}
```

## 🚀 Deployment

### Deploy on Replit

1. Import the repository to Replit
2. Configure environment variables in the Secrets tab
3. Click "Deploy" to publish

### Deploy on Vercel

1. Push to GitHub
2. Import repository on Vercel
3. Add environment variables
4. Deploy

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this for your community events!

## 💚 Credits

Made with ☕ by **Chris & Alex**  
Cursor Ambassadors Brazil

---

<p align="center">
  <a href="https://cursor.com">
    <img src="https://cursor.com/favicon.ico" width="32" height="32" alt="Cursor" />
  </a>
  <br />
  Powered by <a href="https://cursor.com">Cursor</a>
</p>
