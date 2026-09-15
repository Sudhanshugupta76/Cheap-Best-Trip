const express = require('express');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');
const path = require('path');

const rootDir = __dirname;
dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;
const db = new Database(path.join(rootDir, 'trip-data.sqlite'));

app.use(express.json());
app.use(express.static(rootDir));

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS pnr_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr TEXT NOT NULL,
    response_json TEXT NOT NULL,
    checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS running_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT NOT NULL,
    journey_date TEXT NOT NULL,
    response_json TEXT NOT NULL,
    checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS fare_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT NOT NULL,
    station_from TEXT NOT NULL,
    station_to TEXT NOT NULL,
    quota TEXT NOT NULL,
    response_json TEXT NOT NULL,
    checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    booking_type TEXT NOT NULL,
    passenger_name TEXT NOT NULL,
    route TEXT NOT NULL,
    booking_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function isValidPNR(pnr) {
  return /^[0-9]{10}$/.test(pnr);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: 'sqlite', railwayApiConfigured: Boolean(process.env.INDIAN_RAIL_API_KEY) });
});

app.get('/api/railway/pnr', async (req, res) => {
  const pnr = String(req.query.pnr || '').trim();
  if (!isValidPNR(pnr)) return res.status(400).json({ error: 'PNR must contain exactly 10 digits.' });
  if (!process.env.INDIAN_RAIL_API_KEY) return res.status(503).json({ error: 'IndianRailAPI key is not configured on the server.' });

  const route = encodeURIComponent(process.env.INDIAN_RAIL_API_ROUTE || '1');
  const apiUrl = `https://indianrailapi.com/api/v2/PNRCheck/apikey/${encodeURIComponent(process.env.INDIAN_RAIL_API_KEY)}/PNRNumber/${pnr}/Route/${route}/`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    db.prepare('INSERT INTO pnr_checks (pnr, response_json) VALUES (?, ?)').run(pnr, JSON.stringify(data));
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Railway provider request failed.' });
  }
});

app.get('/api/railway/running', async (req, res) => {
  const trainNumber = String(req.query.trainNumber || '').trim();
  const journeyDate = String(req.query.date || '').trim();
  if (!/^\d{1,5}$/.test(trainNumber) || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
    return res.status(400).json({ error: 'Valid train number and journey date are required.' });
  }
  if (!process.env.INDIAN_RAIL_API_KEY) return res.status(503).json({ error: 'IndianRailAPI key is not configured on the server.' });

  const apiDate = journeyDate.replace(/-/g, '');
  const apiUrl = `https://indianrailapi.com/api/v2/livetrainstatus/apikey/${encodeURIComponent(process.env.INDIAN_RAIL_API_KEY)}/trainnumber/${encodeURIComponent(trainNumber)}/date/${apiDate}/`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    db.prepare('INSERT INTO running_checks (train_number, journey_date, response_json) VALUES (?, ?, ?)').run(trainNumber, journeyDate, JSON.stringify(data));
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Railway provider request failed.' });
  }
});

app.get('/api/railway/fare', async (req, res) => {
  const trainNumber = String(req.query.trainNumber || '').trim();
  const stationFrom = String(req.query.from || '').trim().toUpperCase();
  const stationTo = String(req.query.to || '').trim().toUpperCase();
  const quota = String(req.query.quota || 'GN').trim().toUpperCase();
  if (!/^\d{1,5}$/.test(trainNumber) || !/^[A-Z]{2,6}$/.test(stationFrom) || !/^[A-Z]{2,6}$/.test(stationTo) || !/^[A-Z]{2,10}$/.test(quota)) {
    return res.status(400).json({ error: 'Valid train number, station codes and quota are required.' });
  }
  if (!process.env.INDIAN_RAIL_API_KEY) return res.status(503).json({ error: 'IndianRailAPI key is not configured on the server.' });

  const apiUrl = `https://indianrailapi.com/api/v2/TrainFare/apikey/${encodeURIComponent(process.env.INDIAN_RAIL_API_KEY)}/TrainNumber/${encodeURIComponent(trainNumber)}/From/${encodeURIComponent(stationFrom)}/To/${encodeURIComponent(stationTo)}/Quota/${encodeURIComponent(quota)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    db.prepare(`INSERT INTO fare_checks (train_number, station_from, station_to, quota, response_json)
      VALUES (?, ?, ?, ?, ?)`).run(trainNumber, stationFrom, stationTo, quota, JSON.stringify(data));
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Railway provider request failed.' });
  }
});

app.post('/api/bookings', (req, res) => {
  const { ticketNumber, bookingType, passengerName, route, ...booking } = req.body || {};
  if (!ticketNumber || !bookingType || !passengerName || !route) {
    return res.status(400).json({ error: 'ticketNumber, bookingType, passengerName and route are required.' });
  }

  try {
    db.prepare(`INSERT INTO bookings (ticket_number, booking_type, passenger_name, route, booking_json)
      VALUES (?, ?, ?, ?, ?)`)
      .run(ticketNumber, bookingType, passengerName, route, JSON.stringify(booking));
    res.status(201).json({ saved: true, ticketNumber });
  } catch (error) {
    res.status(409).json({ error: 'Booking already exists or could not be saved.' });
  }
});

app.get('/api/bookings/:ticketNumber', (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE ticket_number = ?').get(req.params.ticketNumber);
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ ...row, booking: JSON.parse(row.booking_json) });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Cheap & Best Trip running at http://localhost:${port}`);
});
