// src/lib/db.js

import Dexie from "dexie";

export const db = new Dexie("SkylineNanoAcademyDB");

// Increment the version number to 4 to introduce the new 'isReteach' index.
db.version(4).stores({
  lessons:
    "++id, createdAt, metadata.format, metadata.style, metadata.tone, metadata.ageGroup, metadata.perspective, metadata.isReteach", // Added metadata.isReteach
});
