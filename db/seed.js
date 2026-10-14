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

// APK — Campus Square pickup aligned to the same coords as drop-off (-26.182382, 28.002489)
insertPickup.run(1, 1, 'Campus Square Pickup',
  'Kingsway Ave at Campus Square — stand on the east side of the road',
  -26.182382, 28.002489);
insertPickup.run(2, 1, 'APK Main Gate Stop',
  'Corner Kingsway and University Road, main gate entrance',
  -26.181917, 27.998306);

// APB
insertPickup.run(3, 2, 'APB Bunting Road',
  'Main entrance on Bunting Road, Cottesloe',
  -26.190417, 28.019306);
insertPickup.run(4, 2, 'APB Cottesloe Stop',
  'Bunting Rd intersection, 150m from gate',
  -26.190800, 28.018500);

// DFC
insertPickup.run(5, 3, 'DFC Siemert Road',
  'Corner Siemert and Beit Streets, main stop',
  -26.192389, 28.058028);
insertPickup.run(6, 3, 'DFC Nugget Street',
  'Nugget Street, 100m north of campus gate',
  -26.191500, 28.058500);

// SWC
insertPickup.run(7, 4, 'Soweto Main Entrance',
  'Chris Hani Road main gate, Pimville',
  -26.259272, 27.923809);
insertPickup.run(8, 4, 'Soweto Chris Hani Rd',
  'Chris Hani Rd, 200m west of campus gate',
  -26.259800, 27.921500);

// APK→SWC route: Kingsway Ave pickup (taxi parked waiting)
insertPickup.run(9, 1, 'Kingsway Ave Pickup',
  'Kingsway Ave — taxi parked waiting, no hand signal needed',
  -26.182382, 28.002489);

const insertRoute = db.prepare(`
  INSERT OR IGNORE INTO routes
    (id, from_campus_id, to_campus_id, taxi_identifier, hand_signal,
     estimated_minutes, fare_rands, notes,
     waypoint_name, waypoint_lat, waypoint_lng, waypoint_instruction)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Route 1: APK → DFC  (via Bree, R32 total = R15 + R17)
insertRoute.run(1, 1, 3, 'APK→DFC',
  'One finger pointed upward',
  40, 32.00,
  'Walk to Campus Square pickup (Kingsway Ave). Board taxi to Bree Taxi Rank (R15). Transfer to Eastgate/DFC taxi at ground floor (R17).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Doornfontein / Eastgate (DFC)?" Fare: R17.'
);

// Route 2: DFC → APK  (via Bree, R32 total = R17 + R15)
insertRoute.run(2, 3, 1, 'DFC→APK',
  'One finger pointed upward',
  40, 32.00,
  'Board from Siemert Road heading west toward the CBD (R17). At Bree Rank ground floor, transfer to an Auckland Park/Kingsway taxi (R15).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Campus Square / APK?" Fare: R15.'
);

// Route 3: APK → APB  (direct, R15)
insertRoute.run(3, 1, 2, 'APK→APB',
  'One finger pointed upward OR Open palm facing outward',
  10, 15.00,
  'Short direct trip. Board from Campus Square heading east on Kingsway/Bunting Rd corridor.',
  null, null, null, null
);

// Route 4: APB → APK  (direct, R15)
insertRoute.run(4, 2, 1, 'APB→APK',
  'One finger pointed upward',
  10, 15.00,
  'Short direct trip. Board from Bunting Rd heading west toward Campus Square (APK).',
  null, null, null, null
);

// Route 5: APB → DFC  (via Bree, R32 total = R15 + R17)
insertRoute.run(5, 2, 3, 'APB→DFC',
  'One finger pointed upward',
  35, 32.00,
  'Board from APB heading toward CBD (R15). Transfer at Bree ground floor to Eastgate/DFC taxi (R17).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Doornfontein / Eastgate (DFC)?" Fare: R17.'
);

// Route 6: DFC → APB  (via Bree, R32 total = R17 + R15)
insertRoute.run(6, 3, 2, 'DFC→APB',
  'One finger pointed upward',
  35, 32.00,
  'Board from Siemert Road heading west toward CBD (R17). At Bree ground floor, transfer to APB taxi (R15).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Auckland Park Bunting Road (APB)?" Fare: R15.'
);

// Route 7: APK → SWC  (via Dube, R35 total)
insertRoute.run(7, 1, 4, 'APK→SWC',
  'No hand signal needed',
  55, 35.00,
  'Walk to Kingsway Ave pickup. Board parked taxi to Dube (R17). At Dube transfer to Bara Mall taxi (R18), then walk to SWC.',
  'Dube Drop-off', -26.236873, 27.901563,
  'You have arrived at Dube. Board a taxi heading to Bara Mall / Soweto Campus (SWC). Fare: R18.'
);

// Route 8: SWC → APK  (via Bara + Bree, R51 total = R17 + R19 + R15)
insertRoute.run(8, 4, 1, 'SWC→APK',
  'Three fingers raised upward',
  65, 51.00,
  'Walk to SWC pickup and signal for Bara Taxi Rank (R17). At Bara, transfer to Bree taxi (R19). At Bree ground floor, transfer to Campus Square taxi (R15).',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank / Johannesburg CBD?" Fare: R19.'
);

// Route 9: DFC → SWC  (via Bree + Bara, R37 total = R17 + R20)
insertRoute.run(9, 3, 4, 'DFC→SWC',
  'One finger pointed upward',
  55, 37.00,
  'Board from DFC heading west to Bree Taxi Rank (R17). At Bree upstairs, transfer to Bara/SWC taxi (R20).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (upstairs). Ask a marshal: "Which taxi goes to Bara / Soweto Campus (SWC)?" Fare: R20.'
);

// Route 10: SWC → DFC  (via Bara + Bree, R54 total = R17 + R20 + R17)
insertRoute.run(10, 4, 3, 'SWC→DFC',
  'Three fingers raised upward',
  65, 54.00,
  'Walk to SWC pickup and signal for Bara Taxi Rank (R17). At Bara, transfer to Bree taxi (R20). At Bree ground floor, transfer to Eastgate/DFC taxi (R17).',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank / Johannesburg CBD?" Fare: R20.'
);

// Route 11: APB → SWC  (via Bree + Bara, R35 total = R15 + R20)
insertRoute.run(11, 2, 4, 'APB→SWC',
  'One finger pointed upward',
  55, 35.00,
  'Board from APB heading toward CBD (R15). At Bree upstairs, transfer to Bara/SWC taxi (R20).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (upstairs). Ask a marshal: "Which taxi goes to Bara / Soweto Campus (SWC)?" Fare: R20.'
);

// Route 12: SWC → APB  (via Bara + Bree, R51 total = R17 + R19 + R15)
insertRoute.run(12, 4, 2, 'SWC→APB',
  'Three fingers raised upward',
  65, 51.00,
  'Walk to SWC pickup and signal for Bara Taxi Rank (R17). At Bara, transfer to Bree taxi (R19). At Bree ground floor, transfer to APB taxi (R15).',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank / Johannesburg CBD?" Fare: R19.'
);

const insertSignal = db.prepare(`
  INSERT OR IGNORE INTO hand_signals (id, destination, description, gesture)
  VALUES (?, ?, ?, ?)
`);
insertSignal.run(1, 'Doornfontein / CBD',
  'Heading east toward Joburg CBD / Doornfontein',
  'One finger pointed upward');
insertSignal.run(2, 'Auckland Park / Bree',
  'Heading west toward Auckland Park or Bree Taxi Rank',
  'One finger pointed upward');
insertSignal.run(3, 'Soweto / Bara',
  'Heading southwest toward Soweto / Bara Taxi Rank',
  'Three fingers raised upward');
insertSignal.run(4, 'Bunting Road / APB',
  'Short route along Bunting corridor to Auckland Park Bunting Road',
  'One finger pointed upward OR Open palm facing outward');

console.log('✅ Database seeded successfully!');