const express = require('express');
const cors    = require('cors');
const Database = require('better-sqlite3');
const path    = require('path');

const app = express();
const db  = new Database(path.join(__dirname, 'db', 'taxi.db'));

app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = 'AIzaSyCOL7d4HI_bghnRVCpYxxYS1jNApA3et_o';

// ─── CAMPUSES ────────────────────────────────────────────────────────────────

app.get('/api/campuses', (req, res) => {
  const campuses = db.prepare('SELECT * FROM campuses').all();
  res.json({ success: true, data: campuses });
});

// ─── PICKUP POINTS ───────────────────────────────────────────────────────────

app.get('/api/pickup-points', (req, res) => {
  const points = db.prepare('SELECT * FROM pickup_points').all();
  res.json({ success: true, data: points });
});

app.get('/api/pickup-points/nearest', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'lat and lng are required' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const points  = db.prepare('SELECT * FROM pickup_points').all();

  const toRad     = deg => deg * Math.PI / 180;
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R  = 6371e3;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const nearest = points
    .map(p => ({ ...p, distance_m: Math.round(haversine(userLat, userLng, p.latitude, p.longitude)) }))
    .sort((a, b) => a.distance_m - b.distance_m)[0];

  res.json({ success: true, data: nearest });
});

app.get('/api/pickup-points/campus/:campusId', (req, res) => {
  const points = db.prepare('SELECT * FROM pickup_points WHERE campus_id = ?').all(req.params.campusId);
  res.json({ success: true, data: points });
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────

app.get('/api/routes', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare(`
      SELECT r.*,
        c1.name AS from_campus_name, c1.short_code AS from_code,
        c2.name AS to_campus_name,   c2.short_code AS to_code
      FROM routes r
      JOIN campuses c1 ON r.from_campus_id = c1.id
      JOIN campuses c2 ON r.to_campus_id   = c2.id
      WHERE r.from_campus_id = ? AND r.to_campus_id = ?
    `).all(from, to);
  } else {
    rows = db.prepare(`
      SELECT r.*,
        c1.name AS from_campus_name, c1.short_code AS from_code,
        c2.name AS to_campus_name,   c2.short_code AS to_code
      FROM routes r
      JOIN campuses c1 ON r.from_campus_id = c1.id
      JOIN campuses c2 ON r.to_campus_id   = c2.id
    `).all();
  }
  res.json({ success: true, data: rows });
});

// ─── HAND SIGNALS ────────────────────────────────────────────────────────────

app.get('/api/hand-signals', (req, res) => {
  const signals = db.prepare('SELECT * FROM hand_signals').all();
  res.json({ success: true, data: signals });
});

// ─── DIRECTIONS (real road route via Google) ─────────────────────────────────

app.get('/api/directions', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ success: false, error: 'Missing coordinates' });
  }

  const tryFetch = async (mode) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&mode=${mode}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    return response.json();
  };

  try {
    let data = await tryFetch('driving');
    if (data.status !== 'OK') {
      data = await tryFetch('walking');
    }
    if (data.status !== 'OK') {
      return res.status(404).json({ success: false, error: 'No route found', status: data.status });
    }
    res.json({ success: true, data: data.routes[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── HEALTH ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'UJ Taxi API is running 🚐' });
});

// ─── START ───────────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ UJ Taxi API running at http://localhost:${PORT}`);
});