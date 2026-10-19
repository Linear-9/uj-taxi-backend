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

// Pickup points — the FIRST pickup listed for each campus is the one the
// /api/routes query joins as that campus's pickup / drop-off.

// APK — Campus Square pickup (walk-to point for APK→DFC)
insertPickup.run(1, 1, 'Campus Square Pickup',
  'Kingsway Ave at Campus Square — stand at the roadside',
  -26.182402, 28.002581);
insertPickup.run(2, 1, 'APK Main Gate',
  'Corner Kingsway and University Road, main gate entrance',
  -26.183066, 28.000814);

// APB
insertPickup.run(3, 2, 'APB Bunting Road Pickup',
  'Bunting Rd, outside the APB main gate — taxis to Bree',
  -26.190232, 28.019613);
insertPickup.run(4, 2, 'APB Campus Square Pickup',
  'Pickup for taxis heading to Campus Square (APK)',
  -26.185594, 28.014358);

// DFC
insertPickup.run(5, 3, 'DFC Pickup',
  'Main road outside Doornfontein Campus — taxis to Bree',
  -26.191773, 28.057800);
insertPickup.run(6, 3, 'DFC Main Gate',
  'Corner Siemert and Beit Streets',
  -26.192389, 28.058028);

// SWC
insertPickup.run(7, 4, 'Soweto Campus Pickup',
  'Outside the Soweto Campus main entrance — taxis to Bara',
  -26.259306, 27.924061);
insertPickup.run(8, 4, 'Soweto Campus Main Entrance',
  'Old Potch Road, Soweto',
  -26.259528, 27.923972);

// APK→SWC route: Kingsway Ave pickup (taxi parked waiting)
insertPickup.run(9, 1, 'Kingsway Ave Pickup',
  'Kingsway Ave — taxi parked waiting, no hand signal needed',
  -26.182819, 28.001984);

const insertRoute = db.prepare(`
  INSERT OR IGNORE INTO routes
    (id, from_campus_id, to_campus_id, taxi_identifier, hand_signal,
     estimated_minutes, fare_rands, notes,
     waypoint_name, waypoint_lat, waypoint_lng, waypoint_instruction)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Fares are paid to the driver (no conductor), or passed forward via the
// front-seat passengers once the taxi is moving.

// Route 1: APK → DFC  (via Bree, R32 = R15 + R17)
insertRoute.run(1, 1, 3, 'APK→DFC',
  'One finger pointed upward',
  55, 32.00,
  'Walk to Campus Square pickup. Signal one finger up for a Bree taxi (R15) — confirm it goes to Bree before boarding. At Bree ground floor, ask for the East Gate Mall taxi (R17) and get off at DFC.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to East Gate Mall / Doornfontein (DFC)?" Fare: R17.'
);

// Route 2: DFC → APK  (via Bree, R32 = R17 + R15)
insertRoute.run(2, 3, 1, 'DFC→APK',
  'One finger pointed upward',
  50, 32.00,
  'Walk to the DFC pickup and signal one finger up for a Bree taxi (R17). At Bree ground floor, ask for the Campus Square / APK taxi (R15). Drop off at Campus Square and walk to the APK main gate.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Campus Square / APK?" Fare: R15.'
);

// Route 3: APK → APB  (direct, R15)
insertRoute.run(3, 1, 2, 'APK→APB',
  'One finger pointed upward',
  20, 15.00,
  'Short direct trip. From Campus Square signal one finger up. Ask the driver if the taxi is going toward APB before boarding.',
  null, null, null, null
);

// Route 4: APB → APK  (direct, R15)
insertRoute.run(4, 2, 1, 'APB→APK',
  'Three fingers raised upward',
  20, 15.00,
  'Short direct trip. From the APB Campus Square pickup signal three fingers and confirm the taxi is headed to Campus Square. Drop off at Campus Square and walk to the APK main gate.',
  null, null, null, null
);

// Route 5: APB → DFC  (via Bree, R32 = R15 + R17)
insertRoute.run(5, 2, 3, 'APB→DFC',
  'One finger pointed upward',
  50, 32.00,
  'Signal one finger up from Bunting Rd for a Bree taxi (R15). At Bree ground floor, ask for the Eastgate/DFC taxi (R17).',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Doornfontein / Eastgate (DFC)?" Fare: R17.'
);

// Route 6: DFC → APB  (via Bree, R32 = R17 + R15)
insertRoute.run(6, 3, 2, 'DFC→APB',
  'One finger pointed upward',
  50, 32.00,
  'Walk to the DFC pickup and signal one finger up for a Bree taxi (R17). At Bree ground floor, ask for the APB taxi (R15). Drop off on Bunting Road and walk to the APB main gate.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank (ground floor). Ask a marshal: "Which taxi goes to Auckland Park Bunting Road (APB)?" Fare: R15.'
);

// Route 7: APK → SWC  (via Dube, R35 = R18 + R17)
insertRoute.run(7, 1, 4, 'APK→SWC',
  'No hand signal needed',
  70, 35.00,
  'Walk to the Kingsway Ave pickup and board the parked taxi to Dube (R18) — tell the driver you are heading to UJ Soweto Campus near Bara. At Dube signal one finger down for a Bara Mall taxi (R17), then walk to the SWC main entrance.',
  'Dube Drop-off', -26.236873, 27.901563,
  'You have arrived at Dube. Signal one finger down for a taxi to Bara Mall and tell the driver you are headed to UJ Soweto Campus. Fare: R17.'
);

// Route 8: SWC → APK  (via Bara + Bree, R51 = R17 + R19 + R15)
insertRoute.run(8, 4, 1, 'SWC→APK',
  'One finger pointed downward',
  80, 51.00,
  'Signal one finger down for Bara Taxi Rank (R17) — make sure the taxi is going to Bara. At Bara, ask the marshals for the Bree taxi (R19). At Bree, ask for the Campus Square taxi (R15). Drop off at Campus Square and walk to the APK main gate.',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank?" Fare: R19.'
);

// Route 9: DFC → SWC  (via Bree, R37 = R17 + R20)
insertRoute.run(9, 3, 4, 'DFC→SWC',
  'One finger pointed upward',
  70, 37.00,
  'Signal one finger up from the DFC pickup for a Bree taxi (R17). At Bree, go to the top floor and ask for the Bara taxi (R20). Drop off near Bara Mall and walk to the SWC main entrance.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank. Go to the top floor and ask a marshal: "Which taxi goes to Bara Taxi Rank?" Fare: R20.'
);

// Route 10: SWC → DFC  (via Bara + Bree, R54 = R17 + R20 + R17)
insertRoute.run(10, 4, 3, 'SWC→DFC',
  'One finger pointed downward',
  90, 54.00,
  'Signal one finger down for Bara Taxi Rank (R17). At Bara, ask the marshals for the Bree taxi (R20). At Bree ground floor, ask for the Eastgate/DFC taxi (R17).',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank?" Fare: R20.'
);

// Route 11: APB → SWC  (via Bree, R35 = R15 + R20)
insertRoute.run(11, 2, 4, 'APB→SWC',
  'One finger pointed upward',
  70, 35.00,
  'Signal one finger up from Bunting Rd for a Bree taxi (R15) — confirm it goes to Bree. At Bree, go to the top floor and ask for the Bara taxi (R20). Drop off near Bara Mall and walk to the SWC main entrance.',
  'Bree Taxi Rank', -26.200836, 28.036070,
  'You are at Bree Taxi Rank. Go to the top floor and ask a marshal: "Which taxi goes to Bara Taxi Rank?" Fare: R20.'
);

// Route 12: SWC → APB  (via Bara + Bree, R51 = R17 + R19 + R15)
insertRoute.run(12, 4, 2, 'SWC→APB',
  'One finger pointed downward',
  85, 51.00,
  'Signal one finger down for Bara Taxi Rank (R17). At Bara, ask the marshals for the Bree taxi (R19). At Bree, ask for the "Campus Square UJ" taxi (R15) and get off on Bunting Road at APB.',
  'Bara Taxi Rank', -26.259238, 27.942592,
  'You are at Bara Taxi Rank. Ask a marshal: "Which taxi goes to Bree Taxi Rank?" Fare: R19.'
);

const insertSignal = db.prepare(`
  INSERT OR IGNORE INTO hand_signals (id, destination, description, gesture)
  VALUES (?, ?, ?, ?)
`);
insertSignal.run(1, 'Bree Taxi Rank / CBD',
  'From APK, APB or DFC heading to Bree Taxi Rank',
  'One finger pointed upward');
insertSignal.run(2, 'Bunting Road / APB',
  'From Campus Square (APK) to Auckland Park Bunting Road',
  'One finger pointed upward');
insertSignal.run(3, 'Campus Square / APK',
  'From APB (Bunting Road) to Campus Square, Auckland Park Kingsway',
  'Three fingers raised upward');
insertSignal.run(4, 'Bara Taxi Rank / Bara Mall',
  'From Soweto Campus or Dube heading to Bara',
  'One finger pointed downward');

console.log('✅ Database seeded successfully!');