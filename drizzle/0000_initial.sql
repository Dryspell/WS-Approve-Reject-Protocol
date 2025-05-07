CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY UNIQUE NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  start_time INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS game_room_members (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS game_rounds (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  number INTEGER NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  owner_id TEXT NOT NULL,
  color INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS round_ready_states (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  round_number INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  ready_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
); 