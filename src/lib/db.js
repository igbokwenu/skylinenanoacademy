// src/lib/db.js

import Dexie from "dexie";

export const db = new Dexie("SkylineNanoAcademyDB");

// Increment the version number due to the data structure change (rating -> ratings)
db.version(3).stores({
  // <-- VERSION INCREMENTED FROM 2 to 3
  lessons:
    "++id, createdAt, metadata.format, metadata.style, metadata.tone, metadata.ageGroup, metadata.perspective",
});
