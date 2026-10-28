# Quiet Barangay

Quiet Barangay is a full-stack incident reporting website. Anonymous reports are stored in SQLite. Barangay officials sign in to review reports, update their status, and view the monthly and annual analytics.

## Requirements

- Node.js 20.19 or newer
- npm

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `SESSION_SECRET` to a unique random value of at least 32 characters.
3. Install dependencies with `npm install`.
4. Create an official account by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then running `npm run create-admin`. Use a password with at least 12 characters. Remove `ADMIN_PASSWORD` from `.env` after account creation.
5. Start the website with `npm start`.
6. Open `http://localhost:3000`.

The SQLite database is created at `data/quiet-barangay.sqlite` by default. Change `DATABASE_PATH` in `.env` to store it elsewhere.

For development, `npm run dev` restarts the server when server files change.

## Website behavior

- Only logged-in officials can enter reports; public report submission is disabled.
- Anyone can see a public summary of plate numbers with multiple submitted reports and their report counts. These reports are not confirmed violations.
- Officials can review all reports, plate-number counts and reporting history for each plate, and annual/monthly report summaries.
- Official accounts are created by the administrator; public sign-up is disabled.
- Reports and account credentials are persisted in SQLite and are shared between visitors using this server.

Use HTTPS in production and set `NODE_ENV=production` so session cookies are marked `Secure`. Back up the SQLite database regularly.
