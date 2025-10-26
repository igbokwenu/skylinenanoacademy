// src/lib/db.js

import Dexie from "dexie";

export const db = new Dexie("SkylineNanoAcademyDB");

// Increment the version number to 5 to add the new table.
db.version(5).stores({
  lessons:
    "++id, createdAt, metadata.format, metadata.style, metadata.tone, metadata.ageGroup, metadata.perspective, metadata.isReteach",
  // Add the new table for the Teacher Assistant
  teacherAssistantLessons: "++id, createdAt, title, summary",
});
