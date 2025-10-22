// src/lib/db.js

import Dexie from "dexie";

export const db = new Dexie("SkylineNanoAcademyDB");

// Define the database schema.
// NOTE: Every time you change this, you MUST increment the version number.
db.version(2).stores({
  // <-- VERSION INCREMENTED FROM 1 to 2
  lessons:
    "++id, createdAt, metadata.format, metadata.style, metadata.tone, metadata.ageGroup, metadata.perspective",
  // '++id': Auto-incrementing primary key.
  // 'createdAt': ADDED this index for sorting by date.
  // The rest are indexes for efficient filtering.
});
