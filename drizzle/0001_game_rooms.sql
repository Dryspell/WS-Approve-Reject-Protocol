CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  start_time INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
); 