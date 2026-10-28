require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const express = require('express');
const { rateLimit } = require('express-rate-limit');

const app = express();
const port = Number(process.env.PORT) || 3000;
const sessionSecret = process.env.SESSION_SECRET;
const sessionCookieName = 'qb_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('Set SESSION_SECRET to a random value at least 32 characters long in your .env file.');
}

const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'data', 'quiet-barangay.sqlite'));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS officials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    incident_date TEXT NOT NULL,
    incident_time TEXT NOT NULL,
    location TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    plate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Review',
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    official_id INTEGER NOT NULL REFERENCES officials(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reports_incident_date_idx ON reports(incident_date);
  CREATE INDEX IF NOT EXISTS reports_plate_idx ON reports(plate);
`);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/css', express.static(path.join(__dirname, 'css'), { fallthrough: false }));
app.use('/js', express.static(path.join(__dirname, 'js'), { fallthrough: false }));

const limitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});
const limitReports = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reports submitted. Please try again later.' }
});

function sha256(value) {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('hex');
}

function setSessionCookie(response, token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`
  );
}

function readSessionToken(request) {
  const cookies = request.headers.cookie || '';
  const sessionCookie = cookies.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${sessionCookieName}=`));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice(sessionCookieName.length + 1)) : null;
}

function requireOfficial(request, response, next) {
  const token = readSessionToken(request);
  if (!token || token.length > 200) return response.status(401).json({ error: 'Officials login required.' });

  const session = database.prepare(`
    SELECT officials.id, officials.email
    FROM sessions
    JOIN officials ON officials.id = sessions.official_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(sha256(token), Date.now());
  if (!session) return response.status(401).json({ error: 'Officials login required.' });

  request.official = session;
  next();
}

function validateReport(body) {
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  const vehicle = typeof body.vehicle === 'string' ? body.vehicle : '';
  const plate = typeof body.plate === 'string' ? body.plate.trim().toUpperCase() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!location || location.length > 200) return { error: 'Enter a location (up to 200 characters).' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Enter a valid incident date.' };
  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
    return { error: 'Enter a valid incident date.' };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Enter a valid incident time.' };
  if (!['Motorcycle', 'Other motor vehicle'].includes(vehicle)) return { error: 'Select a valid vehicle type.' };
  if (plate.length > 20) return { error: 'Plate number must be 20 characters or fewer.' };
  if (!description || description.length > 2000) return { error: 'Enter a description (up to 2,000 characters).' };

  return { location, date, time, vehicle, plate: plate || 'N/A', description };
}

function reportFromRow(row) {
  return {
    id: row.id,
    date: row.incident_date,
    incidentDate: row.incident_date,
    time: row.incident_time,
    location: row.location,
    vehicle: row.vehicle,
    plate: row.plate,
    status: row.status,
    description: row.description
  };
}

app.get('/api/session', (request, response) => {
  const token = readSessionToken(request);
  const session = token && token.length <= 200
    ? database.prepare(`
        SELECT officials.id, officials.email
        FROM sessions
        JOIN officials ON officials.id = sessions.official_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      `).get(sha256(token), Date.now())
    : null;
  response.json({ authenticated: Boolean(session), official: session || null });
});

app.post('/api/auth/login', limitLogin, async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const official = database.prepare('SELECT id, email, password_hash FROM officials WHERE email = ?').get(email);

    if (!official || !await bcrypt.compare(password, official.password_hash)) {
      return response.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + sessionDurationMs;
    database.prepare('INSERT INTO sessions (token_hash, official_id, expires_at) VALUES (?, ?, ?)')
      .run(sha256(token), official.id, expiresAt);
    setSessionCookie(response, token, sessionDurationMs / 1000);
    response.json({ authenticated: true, official: { id: official.id, email: official.email } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (request, response) => {
  const token = readSessionToken(request);
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  setSessionCookie(response, '', 0);
  response.json({ authenticated: false });
});

app.get('/api/reports', requireOfficial, (request, response) => {
  const rows = database.prepare('SELECT * FROM reports ORDER BY incident_date DESC, incident_time DESC, rowid DESC').all();
  response.json(rows.map(reportFromRow));
});

app.post('/api/reports', requireOfficial, limitReports, (request, response) => {
  const report = validateReport(request.body || {});
  if (report.error) return response.status(400).json({ error: report.error });

  let id;
  do {
    id = `QB-${report.date.slice(0, 4)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (database.prepare('SELECT 1 FROM reports WHERE id = ?').get(id));

  database.prepare(`
    INSERT INTO reports (id, incident_date, incident_time, location, vehicle, plate, description)
    VALUES (@id, @date, @time, @location, @vehicle, @plate, @description)
  `).run({ id, ...report });
  const saved = database.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  response.status(201).json(reportFromRow(saved));
});

app.get('/api/reports/:id/status', (request, response) => {
  const report = database.prepare('SELECT id, incident_date, status FROM reports WHERE id = ?').get(request.params.id);
  if (!report) return response.status(404).json({ error: 'Report not found.' });
  response.json({ id: report.id, date: report.incident_date, status: report.status });
});

app.patch('/api/reports/:id/status', requireOfficial, (request, response) => {
  const status = request.body && request.body.status;
  const allowedStatuses = ['Pending Review', 'Under Verification', 'Action Taken'];
  if (!allowedStatuses.includes(status)) return response.status(400).json({ error: 'Select a valid report status.' });

  const result = database.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Report not found.' });
  const report = database.prepare('SELECT * FROM reports WHERE id = ?').get(request.params.id);
  response.json(reportFromRow(report));
});

app.get('/', (request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.use((request, response) => {
  if (request.path.startsWith('/api/')) return response.status(404).json({ error: 'Not found.' });
  response.status(404).send('Page not found.');
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = Number(error.status || error.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const message = status === 400
      ? 'Invalid request.'
      : status === 404
        ? 'Not found.'
        : status === 413
          ? 'Request body is too large.'
          : 'Request could not be processed.';
    return response.status(status).json({ error: message });
  }
  console.error('Request failed:', error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
});

const cleanupSessions = database.prepare('DELETE FROM sessions WHERE expires_at <= ?');
setInterval(() => cleanupSessions.run(Date.now()), 60 * 60 * 1000).unref();

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Quiet Barangay website is running at http://localhost:${port}`);
  });
}

module.exports = { app, database };
