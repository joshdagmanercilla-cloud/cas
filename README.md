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
Fix the backend/API connection error in my existing **QUIET BARANGAY — Anonymous Loud Muffler Reporting System** website.

**Current error displayed:**
`Unable to connect to the website server. Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

Website URL: `https://joshdagmanercilla-cloud.github.io/cas/`

### 1. Identify and Fix the Root Cause
Investigate why the frontend expects a JSON response but receives an HTML document instead. Check all JavaScript `fetch()` requests, API endpoints, server routes, and response handling.

Possible causes include:
- The API endpoint URL is incorrect or missing.
- The frontend is requesting an API route from GitHub Pages, which only hosts static websites and does not run backend code.
- The API server is offline or unavailable.
- The server returns an HTML error page instead of JSON.
- A relative API URL incorrectly points to a frontend HTML page.
- The backend configuration, CORS settings, or deployment environment is incorrect.

Do not simply hide the error message. Find and fix the actual cause.

### 2. Configure the Correct Backend Connection
- Inspect the existing project files and identify the actual backend technology and API endpoints.
- If the website is hosted on GitHub Pages, configure the frontend to communicate with the real, deployed backend API.
- Do not assume GitHub Pages can execute PHP, Node.js, Python, or other server-side code.
- If no backend exists, explain what backend service or server configuration is needed before implementing the API-dependent features.
- Store the API base URL in an appropriate configuration file instead of scattering URLs throughout the code.
- Ensure all API requests use the correct HTTP method, headers, and request body.

### 3. Improve API Response Handling
Update the frontend JavaScript so that it:
- Checks the HTTP status and response content type before parsing the response.
- Parses JSON only when the response actually contains JSON.
- Handles network errors, HTTP errors, invalid JSON, empty responses, and unavailable servers gracefully.
- Displays a clear, user-friendly message when the backend cannot be reached.
- Logs useful diagnostic information in the browser console without exposing sensitive information.
- Never treats an HTML error page as a valid JSON response.

### 4. Preserve Existing Website Design
Keep the existing QUIET BARANGAY interface unchanged:
- Dark green and white color scheme.
- Existing hero section and motorcycle background.
- QR code section and Save Website QR button.
- Officials Login and public navigation.
- Report Updates section.
- Existing responsive layout and typography.

Do not redesign the website or remove existing features while fixing the connection problem.

### 5. Verify All Website Features
After fixing the issue, test the following:
1. The homepage loads without an unexpected JSON parsing error.
2. Public pages work correctly on GitHub Pages.
3. Officials Login communicates with the configured backend.
4. Report Updates retrieves and displays actual data from the backend.
5. Form submissions display appropriate success or error messages.
6. Network failures do not crash the page.
7. All navigation links and QR code features continue working.
8. The website works on desktop and mobile browsers.

### 6. Important Implementation Rules
- Inspect the existing source code before making changes.
- Do not invent API endpoints, credentials, database tables, or backend services.
- Do not replace real backend requests with fake successful responses or hardcoded report data.
- Do not expose API keys, passwords, or administrator credentials in frontend code.
- Do not disable security checks to make the error disappear.
- If the backend is missing, clearly identify the missing component and provide the necessary implementation steps.
- Keep changes minimal and compatible with the existing project.

**Expected result:** The website should connect to the correct backend, process valid JSON responses safely, and show a clear error message only when a genuine connection or server problem occurs. Provide a summary of the files changed, the root cause found, and any deployment steps still required.
- Anyone can see a public summary of plate numbers with multiple submitted reports and their report counts. These reports are not confirmed violations.
- Officials can review all reports, plate-number counts and reporting history for each plate, and annual/monthly report summaries.
- Official accounts are created by the administrator; public sign-up is disabled.
- Reports and account credentials are persisted in SQLite and are shared between visitors using this server.

Use HTTPS in production and set `NODE_ENV=production` so session cookies are marked `Secure`. Back up the SQLite database regularly.
