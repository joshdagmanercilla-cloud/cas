require('dotenv').config();

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before creating the first official account.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
  console.error('Use a valid email address and a password with at least 12 characters.');
  process.exit(1);
}

const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'quiet-barangay.sqlite'));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
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
`);

const existingOfficial = database.prepare('SELECT id FROM officials WHERE email = ?').get(email);
if (existingOfficial) {
  console.error('An official account with this email already exists. Account passwords are not overwritten.');
  database.close();
  process.exit(1);
}
const passwordHash = bcrypt.hashSync(password, 12);
database.prepare('INSERT INTO officials (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
database.close();
console.log(`Official account created for ${email}.`);
