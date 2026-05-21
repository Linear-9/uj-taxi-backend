const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'taxi.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS campuses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pickup_points (
    id INTEGER PRIMARY KEY,
    campus_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY,
    from_campus_id INTEGER NOT NULL,
    to_campus_id INTEGER NOT NULL,
    taxi_identifier TEXT NOT NULL,
    hand_signal TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    fare_rands REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (from_campus_id) REFERENCES campuses(id),
    FOREIGN KEY (to_campus_id) REFERENCES campuses(id)
  );

  CREATE TABLE IF NOT EXISTS hand_signals (
    id INTEGER PRIMARY KEY,
    destination TEXT NOT NULL,
    description TEXT NOT NULL,
    gesture TEXT NOT NULL
  );
`);

// Seed campuses
const insertCampus = db.prepare(`
  INSERT OR IGNORE INTO campuses (id, name, short_code, latitude, longitude)
  VALUES (?, ?, ?, ?, ?)
`);

insertCampus.run(1, 'Auckland Park Kingsway', 'APK', -26.181917, 27.998306);
insertCampus.run(2, 'Auckland Park Bunting', 'APB', -26.190417, 28.019306);
insertCampus.run(3, 'Doornfontein Campus',   'DFC', -26.192389, 28.058028);
insertCampus.run(4, 'Soweto Campus',          'SWC', -26.259528, 27.923972);

// Seed pickup points
const insertPickup = db.prepare(`
  INSERT OR IGNORE INTO pickup_points (id, campus_id, name, description, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// APK pickups
insertPickup.run(1, 1, 'APK Main Gate',       'Corner Kingsway and University Road entrance',  -26.181917, 27.998306);
insertPickup.run(2, 1, 'APK Library Stop',    'Outside the main library, Kingsway side',       -26.182200, 27.998900);

// APB pickups
insertPickup.run(3, 2, 'APB Bunting Road',    'Main entrance on Bunting Road, Cottesloe',      -26.190417, 28.019306);
insertPickup.run(4, 2, 'APB Engineering Gate','Engineering faculty entrance, Bunting Road',    -26.190800, 28.019800);

// DFC pickups
insertPickup.run(5, 3, 'DFC Siemert Road',    'Corner Siemert and Beit Streets, main stop',   -26.192389, 28.058028);
insertPickup.run(6, 3, 'DFC Nugget Street',   'Nugget Street intersection near campus gate',  -26.191800, 28.059100);

// Soweto pickups
insertPickup.run(7, 4, 'Soweto Main Entrance','Chris Hani Road main gate, Pimville',          -26.259528, 27.923972);
insertPickup.run(8, 4, 'Soweto Mobility Hub', 'Near Dobsonville taxi rank, Old Potch Road',   -26.260100, 27.924500);

// Seed routes
const insertRoute = db.prepare(`
  INSERT OR IGNORE INTO routes
    (id, from_campus_id, to_campus_id, taxi_identifier, hand_signal, estimated_minutes, fare_rands, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertRoute.run(1,  1, 3, 'APK→DFC', 'Point two fingers down toward the ground', 35, 15.00, 'Catch taxi on Kingsway heading east toward Joburg CBD');
insertRoute.run(2,  3, 1, 'DFC→APK', 'Point index finger left and wave',          35, 15.00, 'Board from Siemert Rd heading west');
insertRoute.run(3,  1, 2, 'APK→APB', 'Open palm facing outward, wave down',       10, 8.00,  'Short trip along Bunting Rd corridor');
insertRoute.run(4,  2, 1, 'APB→APK', 'Closed fist extended outward',              10, 8.00,  'Board from Bunting Rd heading west');
insertRoute.run(5,  2, 3, 'APB→DFC', 'Two fingers pointing right',                30, 13.00, 'Via Auckland Park toward the CBD');
insertRoute.run(6,  3, 2, 'DFC→APB', 'Thumb pointing left',                       30, 13.00, 'Board Siemert Rd heading west');
insertRoute.run(7,  1, 4, 'APK→SWC', 'Three fingers raised upward',               55, 20.00, 'Via N1/N14 toward Soweto — confirm destination with driver');
insertRoute.run(8,  4, 1, 'SWC→APK', 'Wave two fingers toward yourself',          55, 20.00, 'Board at Chris Hani Rd rank');
insertRoute.run(9,  3, 4, 'DFC→SWC', 'Point index finger down and rotate',        50, 18.00, 'Via Crown Gardens interchange');
insertRoute.run(10, 4, 3, 'SWC→DFC', 'Flat hand sweep right',                     50, 18.00, 'Board Dobsonville rank eastbound');

// Seed hand signals reference
const insertSignal = db.prepare(`
  INSERT OR IGNORE INTO hand_signals (id, destination, description, gesture)
  VALUES (?, ?, ?, ?)
`);

insertSignal.run(1, 'Doornfontein / CBD',  'Heading east toward Joburg CBD area', 'Two fingers pointed downward');
insertSignal.run(2, 'Auckland Park',       'Heading west toward Auckland Park',   'Index finger wave to the left');
insertSignal.run(3, 'Soweto',              'Heading southwest toward Soweto',     'Three fingers raised upward');
insertSignal.run(4, 'Bunting Road / APB',  'Short route along Bunting corridor',  'Open palm waved downward');

console.log('✅ Database seeded successfully!');
db.close();