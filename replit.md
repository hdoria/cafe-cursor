# Replit Agent Instructions

## Overview

**Cafe Cursor** is a Next.js 14 web application designed as a credit distribution system for Cursor IDE referral credits at events. Its primary purpose is to allow pre-approved event attendees to claim referral credits through a secure registration system featuring email verification. The application aims to streamline credit distribution, provide an administrative interface for management, and support a global audience with multilingual capabilities.

## User Preferences

All commits must follow Conventional Commits format. I prefer small, focused commits over large monolithic ones. I expect you to adhere to the security best practices outlined, validate all inputs, and use Replit Secrets for all sensitive data. When making changes, prioritize performance optimization, especially for Next.js and database queries. I expect the application to be maintainable, with clear documentation and adherence to the defined tech stack and architectural patterns.

## System Architecture

The application is built on **Next.js 14 (App Router)**, using **TypeScript** for type safety, and styled with **Tailwind CSS**. It interacts with a **PostgreSQL database** via **Prisma ORM**. Email notifications are handled by **Resend**.

**Key Features and Implementations:**
-   **User Registration:** Email verification against a predefined list of eligible users.
-   **Admin Panel:** Accessible via `/admin` with basic authentication (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Features include viewing registrations, managing eligible users, monitoring credit distribution, and data export.
-   **Multilingual Support:** Implemented for Portuguese and English.
-   **API Routes:** Utilizes Next.js Route Handlers (`app/api/[route]/route.ts`). All API errors adhere to the **RFC 7807 Problem Details** standard, providing structured error responses. Input validation is mandatory for all API routes.
-   **Database Access:** All database operations use a singleton Prisma client instance.
-   **Styling:** Primarily uses Tailwind CSS utility classes, with global styles in `app/globals.css`.
-   **Project Structure:** Follows a standard Next.js application structure with dedicated folders for `app/`, `components/`, `lib/`, `prisma/`, and `public/`.
-   **Development Environment:** Configured to run on port 5000 within Replit, binding to `0.0.0.0`. Prisma Studio is available for database inspection.

## External Dependencies

-   **PostgreSQL:** The primary database, auto-configured by Replit.
-   **Prisma ORM:** Used for database interaction and schema management.
-   **Resend:** Email service for sending verification and notification emails.
-   **Next.js:** The web framework.
-   **Tailwind CSS:** For styling.