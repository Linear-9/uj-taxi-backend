const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');
const path     = require('path');

const app = express();
const db  = new Database(path.join(__dirname, 'db', 'taxi.db'));

app.use(cors());
app.use(express.json());

db.pragma('foreign_keys = ON');
function autoSeed() {
  try {
    const count = db.prepare("SELECT COUNT(*) FROM campuses").pluck().get();
    if (count === 0) {
      console.log(' Database empty — running seed...');
      require('./db/seed.js');
    }
  } catch (e) {
    console.log(' Tables missing — running seed...');
    require('./db/seed.js');
  }
}
autoSeed();

// ─── TEMP: FORCE RESEED (remove after use) ────────────────────────────────────
app.get('/api/admin/reseed', (req, res) => {
  try {
    db.exec('DELETE FROM hand_signals; DELETE FROM routes; DELETE FROM pickup_points; DELETE FROM campuses;');
    delete require.cache[require.resolve('./db/seed.js')];
    require('./db/seed.js');
    res.json({ success: true, message: 'Reseeded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const GOOGLE_API_KEY = 'AIzaSyCOL7d4HI_bghnRVCpYxxYS1jNApA3et_o';

// ─── CAMPUSES ────────────────────────────────────────────────────────────────

app.get('/api/campuses', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, short_code, latitude, longitude
      FROM campuses
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PICKUP POINTS ───────────────────────────────────────────────────────────

app.get('/api/pickup-points', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM pickup_points').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pickup-points/nearest', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, error: 'lat and lng required' });

  try {
    const points  = db.prepare('SELECT * FROM pickup_points').all();
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const toRad     = d => d * Math.PI / 180;
    const haversine = (lat1, lng1, lat2, lng2) => {
      const R    = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a    = Math.sin(dLat/2)**2 +
                   Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const nearest = points
      .map(p => ({ ...p, distanceMetres: Math.round(haversine(userLat, userLng, p.latitude, p.longitude)) }))
      .sort((a, b) => a.distanceMetres - b.distanceMetres)[0];

    if (!nearest) return res.status(404).json({ success: false, error: 'No pickup points found' });
    res.json({ success: true, data: nearest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pickup-points/campus/:campusId', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM pickup_points WHERE campus_id = ?').all(req.params.campusId);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/api/routes', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ success: false, error: 'from and to campus IDs required' });

  try {
    const routes = db.prepare(`
      SELECT r.*,
             c1.name AS from_campus_name, c1.short_code AS from_code,
             c2.name AS to_campus_name,   c2.short_code AS to_code,
             p1.name AS from_pickup_name, p1.description AS from_pickup_desc,
             p1.latitude AS from_pickup_lat, p1.longitude AS from_pickup_lng,
             p2.name AS to_pickup_name,   p2.description AS to_pickup_desc,
             p2.latitude AS to_pickup_lat, p2.longitude AS to_pickup_lng
      FROM routes r
      JOIN campuses c1 ON r.from_campus_id = c1.id
      JOIN campuses c2 ON r.to_campus_id   = c2.id
      LEFT JOIN pickup_points p1 ON p1.campus_id = r.from_campus_id AND p1.id = (
        SELECT id FROM pickup_points WHERE campus_id = r.from_campus_id ORDER BY id LIMIT 1
      )
      LEFT JOIN pickup_points p2 ON p2.campus_id = r.to_campus_id AND p2.id = (
        SELECT id FROM pickup_points WHERE campus_id = r.to_campus_id ORDER BY id LIMIT 1
      )
      WHERE r.from_campus_id = ? AND r.to_campus_id = ?
    `).all(parseInt(from), parseInt(to));
    res.json({ success: true, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── HAND SIGNALS ────────────────────────────────────────────────────────────

app.get('/api/hand-signals', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, destination, gesture, description
      FROM hand_signals
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DIRECTIONS ───────────────────────────────────────────────────────────────

app.get('/api/directions', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng)
    return res.status(400).json({ success: false, error: 'Missing coordinates' });

  const tryFetch = async (mode) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json`
      + `?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`
      + `&mode=${mode}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    return response.json();
  };

  try {
    let data = await tryFetch('driving');
    if (data.status !== 'OK') data = await tryFetch('walking');
    if (data.status !== 'OK')
      return res.status(404).json({ success: false, error: 'No route found', status: data.status });

    const encodedPolyline = data.routes[0].overview_polyline.points;
    res.json({ success: true, status: 'OK', encodedPolyline });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── HEALTH ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Taxi Link SA API is running 🚐' });
});

// ─── START ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Taxi Link SA API running at http://localhost:${PORT}`);
});