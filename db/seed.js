const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'taxi.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS campuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT null,
    short_code TEXT NOT null,
    latitude REAL NOT null,
    longitude REAL NOT null
  );

  CREATE TABLE IF NOT EXISTS pickup_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campus_id INTEGER NOT null,
    name TEXT NOT null,
    description TEXT,
    latitude REAL NOT null,
    longitude REAL NOT null
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_campus_id INTEGER NOT null,
    to_campus_id INTEGER NOT null,
    taxi_identifier TEXT NOT null,
    hand_signal TEXT NOT null,
    estimated_minutes INTEGER NOT null,
    fare_rands REAL NOT null,
    notes TEXT,
    waypoint_name TEXT,
    waypoint_lat REAL,
    waypoint_lng REAL,
    waypoint_instruction TEXT
  );

  CREATE TABLE IF NOT EXISTS hand_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination TEXT NOT null,
    description TEXT NOT null,
    gesture TEXT NOT null
  );
`);

const insertCampus = db.prepare(`
  INSERT OR IGNORE INTO campuses (id, name, short_code, latitude, longitude)
  VALUES (?, ?, ?, ?, ?)
`);

insertCampus.run(1, 'Auckland Park Kingsway', 'APK', -26.181917, 27.998306);
insertCampus.run(2, 'Auckland Park Bunting',  'APB', -26.190417, 28.019306);
insertCampus.run(3, 'Doornfontein Campus',    'DFC', -26.192389, 28.058028);
insertCampus.run(4, 'Soweto Campus',          'SWC', -26.259528, 27.923972);

const insertPickup = db.prepare(`
  INSERT OR IGNORE INTO pickup_points (id, campus_id, name, description, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// APK — pickup near Capital Square (Kingsway Ave, heading east toward CBD)
insertPickup.run(1, 1, 'Campus Square Pickup', 'Kingsway Ave at Campus Square — stand on the east side of the road', -26.182800, 28.004500);
insertPickup.run(2, 1, 'APK Main Gate Stop',    'Corner Kingsway and University Road, main gate entrance',             -26.181917, 27.998306);

// APB
insertPickup.run(3, 2, 'APB Bunting Road',      'Main entrance on Bunting Road, Cottesloe',   -26.190417, 28.019306);
insertPickup.run(4, 2, 'APB Cottesloe Stop',    'Bunting Rd intersection, 150m from gate',    -26.190800, 28.018500);

// DFC
insertPickup.run(5, 3, 'DFC Siemert Road',      'Corner Siemert and Beit Streets, main stop', -26.192389, 28.058028);
insertPickup.run(6, 3, 'DFC Nugget Street',     'Nugget Street, 100m north of campus gate',   -26.191500, 28.058500);

// Soweto
insertPickup.run(7, 4, 'Soweto Main Entrance',  'Chris Hani Road main gate, Pimville',        -26.259528, 27.923972);
insertPickup.run(8, 4, 'Soweto Chris Hani Rd',  'Chris Hani Rd, 200m west of campus gate',   -26.259800, 27.921500);

const insertRoute = db.prepare(`
  INSERT OR IGNORE INTO routes
    (id, from_campus_id, to_campus_id, taxi_identifier, hand_signal, estimated_minutes, fare_rands, notes, waypoint_name, waypoint_lat, waypoint_lng, waypoint_instruction)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertRoute.run(1, 1, 3, 'APK→DFC',
  'One finger pointed upward',
  40, 32.00,
  'Walk to Campus Square pickup. Board taxi to Bree Taxi Rank. Transfer to East Gate taxi to DFC.',
  'Bree Taxi Rank', -26.204722, 28.040278,
  'Ask anyone in the rank for a taxi going to East Gate. Tell the driver you are going to UJ Doornfontein.'
);

insertRoute.run(2, 3, 1, 'DFC→APK',
  'Point index finger left and wave slowly',
  40, 32.00,
  'Board from Siemert Road heading west toward the CBD. At Bree Rank, transfer to an Auckland Park / Kingsway taxi.',
  'Bree Taxi Rank', -26.204722, 28.040278,
  'You are at Bree Taxi Rank. Board a taxi heading to Auckland Park / Kingsway (APK).'
);

insertRoute.run(3, 1, 2, 'APK→APB',
  'Open palm facing outward, wave downward',
  10, 15.00,
  'Short trip along Bunting Rd corridor. No rank transfer needed.',
  null, null, null, null
);

insertRoute.run(4, 2, 1, 'APB→APK',
  'Closed fist extended outward',
  10, 15.00,
  'Board from Bunting Rd heading west toward Auckland Park.',
  null, null, null, null
);

insertRoute.run(5, 2, 3, 'APB→DFC',
  'Two fingers pointing to the right',
  35, 32.00,
  'Via Auckland Park toward the CBD. Transfer at Bree if needed.',
  'Bree Taxi Rank', -26.204722, 28.040278,
  'Transfer at Bree Taxi Rank to a Doornfontein taxi.'
);

insertRoute.run(6, 3, 2, 'DFC→APB',
  'Thumb pointing left',
  35, 32.00,
  'Board Siemert Rd heading west.',
  null, null, null, null
);

insertRoute.run(7, 1, 4, 'APK→SWC',
  'Three fingers raised upward',
  55, 20.00,
  'Via N1/N14 toward Soweto — confirm destination with driver.',
  null, null, null, null
);

insertRoute.run(8, 4, 1, 'SWC→APK',
  'Wave two fingers toward yourself',
  55, 20.00,
  'Board at Chris Hani Rd rank.',
  null, null, null, null
);

insertRoute.run(9, 3, 4, 'DFC→SWC',
  'Point index finger down and rotate slowly',
  50, 18.00,
  'Via Crown Gardens interchange.',
  null, null, null, null
);

insertRoute.run(10, 4, 3, 'SWC→DFC',
  'Flat hand sweep to the right',
  50, 18.00,
  'Board Dobsonville rank eastbound.',
  null, null, null, null
);


const insertSignal = db.prepare(`
  INSERT OR IGNORE INTO hand_signals (id, destination, description, gesture)
  VALUES (?, ?, ?, ?)
`);
insertSignal.run(1, 'Doornfontein / CBD',  'Heading east toward Joburg CBD / Doornfontein', 'Two fingers pointed downward');
insertSignal.run(2, 'Auckland Park',        'Heading west toward Auckland Park',              'Index finger wave to the left');
insertSignal.run(3, 'Soweto',               'Heading southwest toward Soweto',                'Three fingers raised upward');
insertSignal.run(4, 'Bunting Road / APB',   'Short route along Bunting corridor',             'Open palm waved downward');

console.log('✅ Database seeded successfully!');
