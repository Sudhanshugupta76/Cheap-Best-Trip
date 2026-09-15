const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;
const databasePath = path.join(rootDir, 'trip-data.json');

function loadDatabase() {
  try {
    return JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  } catch (error) {
    return { pnr_checks: [], running_checks: [], fare_checks: [], bookings: [] };
  }
}

const db = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(databasePath, JSON.stringify(db, null, 2));
}

function addRecord(collection, record) {
  const item = { id: db[collection].length + 1, ...record, checked_at: new Date().toISOString() };
  db[collection].push(item);
  saveDatabase();
  return item;
}

app.use(express.json());
app.use(express.static(rootDir));

function isValidPNR(pnr) {
  return /^[0-9]{10}$/.test(pnr);
}

function findProviderValue(value, names) {
  if (!value || typeof value !== 'object') return '';
  const wanted = names.map(name => name.toLowerCase());
  for (const [key, entry] of Object.entries(value)) {
    if (wanted.includes(key.toLowerCase()) && (typeof entry === 'string' || typeof entry === 'number')) return String(entry);
  }
  for (const entry of Object.values(value)) {
    if (entry && typeof entry === 'object') {
      const match = findProviderValue(entry, names);
      if (match) return match;
    }
  }
  return '';
}

function normalizeRunningStatus(data, trainNumber, journeyDate) {
  return {
    trainNumber: findProviderValue(data, ['TrainNumber', 'train_number', 'TrainNo']) || trainNumber,
    trainName: findProviderValue(data, ['TrainName', 'train_name']),
    status: findProviderValue(data, ['Status', 'TrainStatus', 'CurrentStatus', 'Message']) || 'Running status received',
    currentStation: findProviderValue(data, ['CurrentStation', 'CurrentStationName', 'StationName', 'Location']),
    currentStationCode: findProviderValue(data, ['CurrentStationCode', 'StationCode']),
    delay: findProviderValue(data, ['Delay', 'DelayInMinutes', 'LateBy', 'LateMinutes']),
    lastUpdated: findProviderValue(data, ['LastUpdated', 'UpdatedAt', 'UpdateTime', 'Time']),
    journeyDate,
    raw: data
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: 'json-file', railwayApiConfigured: Boolean(process.env.INDIAN_RAIL_API_KEY) });
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
    addRecord('pnr_checks', { pnr, response_json: data });
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('PNR provider request failed:', error.message);
    res.status(502).json({ error: 'Railway provider request failed. Check API key, network access and provider availability.' });
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
    addRecord('running_checks', { train_number: trainNumber, journey_date: journeyDate, response_json: data });
    if (!response.ok) return res.status(response.status).json(data);
    res.json(normalizeRunningStatus(data, trainNumber, journeyDate));
  } catch (error) {
    console.error('Running-status provider request failed:', error.message);
    res.status(502).json({ error: 'Running-status provider request failed. Check API key, network access and provider availability.' });
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
    addRecord('fare_checks', { train_number: trainNumber, station_from: stationFrom, station_to: stationTo, quota, response_json: data });
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

  if (db.bookings.some(item => item.ticket_number === ticketNumber)) {
    res.status(409).json({ error: 'Booking already exists or could not be saved.' });
    return;
  }
  addRecord('bookings', { ticket_number: ticketNumber, booking_type: bookingType, passenger_name: passengerName, route, booking_json: booking });
  res.status(201).json({ saved: true, ticketNumber });
});

app.get('/api/bookings/:ticketNumber', (req, res) => {
  const row = db.bookings.find(item => item.ticket_number === req.params.ticketNumber);
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ ...row, booking: row.booking_json });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Cheap & Best Trip running at http://localhost:${port}`);
});
