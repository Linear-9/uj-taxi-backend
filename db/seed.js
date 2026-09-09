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
insertPickup.run(1, 1, 'Campus Square Pickup', 'Kingsway Ave at Campus Square — stand on the east side of the road', -26.182568, 28.002632);
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

// APK→SWC route: Kingsway Ave pickup (taxi parked waiting)
insertPickup.run(9, 1, 'Kingsway Ave Pickup', 'Kingsway Ave — taxi parked waiting, no hand signal needed', -26.182819, 28.001984);

const insertRoute = db.prepare(`
  INSERT OR IGNORE INTO routes
    (id, from_campus_id, to_campus_id, taxi_identifier, hand_signal, estimated_minutes, fare_rands, notes, waypoint_name, waypoint_lat, waypoint_lng, waypoint_instruction)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertRoute.run(1, 1, 3, 'APK→DFC',
  'One finger pointed upward',
  40, 32.00,
  'Walk to Campus Square pickup. Board taxi to Bree Taxi Rank. Transfer to East Gate taxi to DFC.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'Ask anyone in the rank for a taxi going to East Gate. Tell the driver you are going to UJ Doornfontein.'
);

insertRoute.run(2, 3, 1, 'DFC→APK',
  'One finger pointed upward',
  40, 32.00,
  'Board from Siemert Road heading west toward the CBD. At Bree Rank, transfer to an Auckland Park / Kingsway taxi.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank. Board a taxi heading to Auckland Park / Kingsway (APK).'
);

insertRoute.run(3, 1, 2, 'APK→APB',
  'One finger pointed upward OR Open palm facing outward  ',
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
  'One finger pointed upward OR Open palm facing outward ',
  35, 32.00,
  'Via Auckland Park toward the CBD. Transfer at Bree if needed.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'Transfer at Bree Taxi Rank to a Doornfontein taxi.'
);

insertRoute.run(6, 3, 2, 'DFC→APB',
  'One finger pointed upward ',
  35, 32.00,
  'Board Siemert Rd heading west.',
  null, null, null, null
);

// APK→SWC: 2 taxis, exchange at Dube
// Stored waypoint = Dube drop-off (first exchange point)
insertRoute.run(7, 1, 4, 'APK→SWC',
  'No hand signal needed',
  55, 35.00,
  'Walk to Kingsway Ave pickup. Board parked taxi to Dube. At Dube transfer to Bara Mall taxi, then walk to campus.',
  'Dube Drop-off', -26.236873, 27.901563,
  'You have arrived at Dube. Board a taxi heading to Bara Mall. Use the hand signal for Bara Mall.'
);

// SWC→APK: 3 taxis, exchanges at Bara and Bree
// Stored waypoint = Bara Taxi Rank (first exchange point)
insertRoute.run(8, 4, 1, 'SWC→APK',
  'One finger pointed upward',
  65, 51.00,
  'Walk to SWC pickup and signal for Bara Taxi Rank. At Bara transfer to Bree taxi. At Bree transfer to Campus Square taxi.',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask marshals for a taxi going to Bree Taxi Rank. Fare is R19.'
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
insertSignal.run(1, 'Doornfontein / CBD',  'Heading east toward Joburg CBD / Doornfontein', 'One finger pointed upward');
insertSignal.run(2, 'Auckland Park',        'Heading west toward Auckland Park',              'One finger pointed upward');
insertSignal.run(3, 'Soweto',               'Heading southwest toward Soweto',                'Three fingers raised upward');
insertSignal.run(4, 'Bunting Road / APB',   'Short route along Bunting corridor',             'One finger pointed upward OR Open palm facing outward');

console.log('✅ Database seeded successfully!');